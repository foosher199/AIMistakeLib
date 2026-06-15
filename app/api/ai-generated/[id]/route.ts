/**
 * AI Generated Questions API - Delete
 *
 * DELETE /api/ai-generated/[id]
 * 删除 AI 生成的变式题
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { UUIDSchema } from '@/lib/validations/question'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const idValidation = UUIDSchema.safeParse(id)
    if (!idValidation.success) {
      return NextResponse.json({ error: '无效的生成题ID' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ai_generated_questions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/ai-generated/[id] error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
