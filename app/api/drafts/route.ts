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

/**
 * DELETE /api/drafts
 *
 * 批量删除草稿
 * Body: { ids: string[] }
 */
export async function DELETE(request: Request) {
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

    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '无效的 ids 参数' }, { status: 400 })
    }

    const { error } = await supabase
      .from('mistake_drafts')
      .delete()
      .eq('user_id', user.id)
      .in('id', ids)

    if (error) {
      console.error('[API] 批量删除草稿失败:', error)
      return NextResponse.json(
        { error: '批量删除草稿失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error('DELETE /api/drafts error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: '批量删除草稿失败' },
      { status: 500 }
    )
  }
}
