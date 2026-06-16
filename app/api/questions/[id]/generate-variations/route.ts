/**
 * Questions API - AI 举一反三
 *
 * POST /api/questions/[id]/generate-variations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/lib/supabase-server'
import {
  UUIDSchema,
  parseAndValidate,
  GenerateVariationsSchema,
} from '@/lib/validations/question'
import { generateQuestionVariations } from '@/lib/ai/variation-generator'
import { aiRateLimiter } from '@/lib/rate-limit'
import type { Subject, Difficulty, AIGeneratedQuestionInsert } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

    const { id } = await params
    const idValidation = UUIDSchema.safeParse(id)
    if (!idValidation.success) {
      return NextResponse.json({ error: '无效的错题ID' }, { status: 400 })
    }

    const body = await request.json()
    const validation = parseAndValidate(GenerateVariationsSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      )
    }

    const { count, difficulty: targetDifficulty } = validation.data

    const rateLimit = aiRateLimiter.check(`ai_generate_variations:${user.id}`, 20)
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000)),
          },
        }
      )
    }

    const { data: question, error: fetchError } = await supabase
      .from('mistake_questions')
      .select('content, answer, explanation, subject, category, difficulty')
      .eq('id', id)
      .single()

    if (fetchError || !question) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const variations = await generateQuestionVariations({
      content: question.content,
      answer: question.answer,
      explanation: question.explanation,
      subject: question.subject as Subject,
      category: question.category,
      difficulty: question.difficulty as Difficulty,
      count,
      targetDifficulty,
    })

    const inserts: AIGeneratedQuestionInsert[] = variations.map((v) => ({
      user_id: user.id,
      source_question_id: id,
      content: v.content,
      subject: v.subject,
      category: v.category,
      difficulty: v.difficulty,
      answer: v.answer,
      explanation: v.explanation,
      feedback_status: 'valid',
    }))

    const { data: savedVariations, error: insertError } = await supabase
      .from('ai_generated_questions')
      .insert(inserts)
      .select()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ variations: savedVariations })
  } catch (error) {
    console.error('POST /api/questions/[id]/generate-variations error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
