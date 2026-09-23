/**
 * AI Generated Questions API - List
 *
 * GET /api/ai-generated?sourceQuestionId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/lib/supabase-server'
import { z } from 'zod'

const QuerySchema = z.object({
  sourceQuestionId: z.string().uuid('无效的错题ID').optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase } = authResult

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams)
    const validation = QuerySchema.safeParse(params)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 })
    }

    const { sourceQuestionId } = validation.data

    let query = supabase
      .from('ai_generated_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (sourceQuestionId) {
      query = query.eq('source_question_id', sourceQuestionId)
    }

    const { data: variations, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ variations: variations || [] })
  } catch (error) {
    console.error('GET /api/ai-generated error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
