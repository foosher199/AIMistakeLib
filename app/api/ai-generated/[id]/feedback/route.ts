/**
 * AI Generated Questions API - Feedback
 *
 * POST /api/ai-generated/[id]/feedback
 * 对 AI 生成的变式题反馈“合理/不合理”
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/lib/supabase-server'
import {
  UUIDSchema,
  parseAndValidate,
  FeedbackVariationSchema,
} from '@/lib/validations/question'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase } = authResult

    const { id } = await params
    const idValidation = UUIDSchema.safeParse(id)
    if (!idValidation.success) {
      return NextResponse.json({ error: '无效的生成题ID' }, { status: 400 })
    }

    const body = await request.json()
    const validation = parseAndValidate(FeedbackVariationSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      )
    }

    const { status } = validation.data

    const { data: updated, error } = await supabase
      .from('ai_generated_questions')
      .update({ feedback_status: status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ generatedQuestion: updated })
  } catch (error) {
    console.error('POST /api/ai-generated/[id]/feedback error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
