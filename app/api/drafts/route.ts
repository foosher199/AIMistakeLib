/**
 * Drafts API - 草稿/待处理题目
 *
 * GET /api/drafts - 获取当前用户的草稿列表
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/drafts
 *
 * 获取当前用户的草稿列表
 * 按创建时间倒序排列
 */
export async function GET() {
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

    const { data: drafts, error } = await supabase
      .from('mistake_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] 获取草稿列表失败:', error)
      return NextResponse.json(
        { error: '获取草稿列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ drafts: drafts ?? [] })
  } catch (error) {
    console.error('GET /api/drafts error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: '获取草稿列表失败' },
      { status: 500 }
    )
  }
}
