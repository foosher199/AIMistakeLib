/**
 * Draft Save API
 *
 * POST /api/drafts/[id]/save - 将草稿保存到正式错题表
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/drafts/[id]/save
 *
 * 1. 读取草稿内容
 * 2. 插入到 mistake_questions 表
 * 3. 删除草稿
 * 4. 返回新创建的正式题目
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

    const { id } = await params

    // 读取草稿
    const { data: draft, error: fetchError } = await supabase
      .from('mistake_drafts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json(
        { error: '草稿不存在或无权限保存' },
        { status: 404 }
      )
    }

    // 插入到正式表
    const { data: question, error: insertError } = await supabase
      .from('mistake_questions')
      .insert({
        user_id: user.id,
        content: draft.content,
        subject: draft.subject,
        category: draft.category,
        difficulty: draft.difficulty,
        answer: draft.answer,
        explanation: draft.explanation,
        image_url: draft.image_url,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] 保存草稿到正式表失败:', insertError)
      return NextResponse.json(
        { error: '保存题目失败' },
        { status: 500 }
      )
    }

    // 删除草稿
    const { error: deleteError } = await supabase
      .from('mistake_drafts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[API] 删除草稿失败:', deleteError)
      // 保存成功但删除草稿失败，不影响主流程
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('POST /api/drafts/[id]/save error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: '保存草稿失败' },
      { status: 500 }
    )
  }
}
