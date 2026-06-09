/**
 * Draft API - 单条草稿操作
 *
 * DELETE /api/drafts/[id] - 删除草稿
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * DELETE /api/drafts/[id]
 *
 * 删除草稿
 */
export async function DELETE(
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

    const { id } = await params

    // 验证草稿属于当前用户
    const { data: draft, error: fetchError } = await supabase
      .from('mistake_drafts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json(
        { error: '草稿不存在或无权限删除' },
        { status: 404 }
      )
    }

    // 删除草稿
    const { error: deleteError } = await supabase
      .from('mistake_drafts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[API] 删除草稿失败:', deleteError)
      return NextResponse.json(
        { error: '删除草稿失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/drafts/[id] error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: '删除草稿失败' },
      { status: 500 }
    )
  }
}
