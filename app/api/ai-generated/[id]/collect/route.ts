/**
 * AI Generated Questions API - Collect
 *
 * POST /api/ai-generated/[id]/collect
 * 将 AI 生成的变式题收藏为正式错题
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/lib/supabase-server'
import { UUIDSchema } from '@/lib/validations/question'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

    const { id } = await params
    const idValidation = UUIDSchema.safeParse(id)
    if (!idValidation.success) {
      return NextResponse.json({ error: '无效的生成题ID' }, { status: 400 })
    }

    const { data: generated, error: fetchError } = await supabase
      .from('ai_generated_questions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !generated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: question, error: insertError } = await supabase
      .from('mistake_questions')
      .insert({
        user_id: user.id,
        content: `[举一反三] ${generated.content}`,
        subject: generated.subject,
        category: generated.category,
        difficulty: generated.difficulty,
        answer: generated.answer,
        explanation: generated.explanation,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('POST /api/ai-generated/[id]/collect error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
