/**
 * Questions API - Master
 *
 * POST /api/questions/[id]/master - 标记为已掌握
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { UUIDSchema } from '@/lib/validations/question'

/**
 * POST /api/questions/[id]/master
 *
 * 功能：标记为已掌握
 * - is_mastered = true
 *
 * 响应：
 * {
 *   question: Question
 * }
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()

    // 验证用户登录
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 验证 ID 格式
    const { id } = await params
    const idValidation = UUIDSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json({ error: '无效的错题ID' }, { status: 400 })
    }

    // 标记为已掌握
    const { data: question, error } = await supabase
      .from('mistake_questions')
      .update({ is_mastered: true })
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

    if (!question) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('POST /api/questions/[id]/master error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
