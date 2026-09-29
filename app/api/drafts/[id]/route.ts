/**
 * Draft API - 单条草稿操作
 *
 * GET    /api/drafts/[id] - 获取草稿详情
 * DELETE /api/drafts/[id] - 删除草稿
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'
import { attachSignedDraftImages } from '@/server/images'

/**
 * GET /api/drafts/[id]
 *
 * 获取草稿详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

    const { id } = await params

    const { data: draft, error } = await supabase
      .from('mistake_drafts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !draft) {
      return NextResponse.json({ error: '草稿不存在' }, { status: 404 })
    }

    const [draftWithImage] = await attachSignedDraftImages([draft], user.id)
    return NextResponse.json({ draft: draftWithImage })
  } catch (error) {
    console.error('GET /api/drafts/[id] error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: '获取草稿失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/drafts/[id]
 *
 * 删除草稿
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

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
