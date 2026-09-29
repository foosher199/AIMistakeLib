/**
 * Questions API - Review
 *
 * POST /api/questions/[id]/review - 记录复习
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'
import { UUIDSchema } from '@/contracts/question'

/**
 * POST /api/questions/[id]/review
 *
 * 功能：记录一次复习
 * - review_count + 1
 * - last_reviewed = 当前时间
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

    // 先获取当前 review_count
    const { data: current, error: fetchError } = await supabase
      .from('mistake_questions')
      .select('review_count')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 更新复习记录
    const { data: question, error } = await supabase
      .from('mistake_questions')
      .update({
        review_count: current.review_count + 1,
        last_reviewed: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('POST /api/questions/[id]/review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
