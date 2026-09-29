/**
 * Questions API - Master
 *
 * POST /api/questions/[id]/master - 标记为已掌握
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'
import { UUIDSchema } from '@/contracts/question'

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase } = authResult

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
