/**
 * Questions API - AI 错因分析
 *
 * POST /api/questions/[id]/analyze-mistake
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'
import { UUIDSchema, parseAndValidate, AnalyzeMistakeSchema } from '@/contracts/question'
import { analyzeMistakeReason } from '@/server/ai/mistake-analysis'
import { aiRateLimiter } from '@/server/rate-limit'

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
    const validation = parseAndValidate(AnalyzeMistakeSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 })
    }

    const rateLimit = aiRateLimiter.check(`ai_analyze_mistake:${user.id}`, 20)
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
      .select('content, answer, user_answer, subject, category')
      .eq('id', id)
      .single()

    if (fetchError || !question) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const analysis = await analyzeMistakeReason({
      content: question.content,
      answer: question.answer,
      userAnswer: question.user_answer,
      subject: question.subject,
      category: question.category,
    })

    const { data: updatedQuestion, error: updateError } = await supabase
      .from('mistake_questions')
      .update({
        mistake_reason: analysis.tags,
        mistake_reason_detail: analysis.detail,
        mistake_reason_advice: analysis.advice,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ question: updatedQuestion, analysis })
  } catch (error) {
    console.error('POST /api/questions/[id]/analyze-mistake error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
