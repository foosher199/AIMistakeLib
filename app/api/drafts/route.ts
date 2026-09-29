/**
 * Drafts API - 草稿/待处理题目
 *
 * GET  /api/drafts - 获取当前用户的草稿列表
 * POST /api/drafts - 创建新草稿
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'

/**
 * GET /api/drafts
 *
 * 获取当前用户的草稿列表
 * 按创建时间倒序排列
 */
export async function GET(request: NextRequest) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

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
 * POST /api/drafts
 *
 * 创建新草稿
 * Body: {
 *   content: string,
 *   subject: string,
 *   category: string,
 *   difficulty: string,
 *   answer: string,
 *   explanation?: string,
 *   confidence?: number,
 *   image_url?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

    const body = await request.json()
    const { content, subject, category, difficulty, answer, explanation, confidence, image_url } = body

    if (!content || !subject || !category || !difficulty || !answer) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }

    const { data: draft, error } = await supabase
      .from('mistake_drafts')
      .insert({
        user_id: user.id,
        content,
        subject,
        category,
        difficulty,
        answer,
        explanation,
        confidence,
        image_url,
      })
      .select()
      .single()

    if (error) {
      console.error('[API] 创建草稿失败:', error)
      return NextResponse.json({ error: '创建草稿失败' }, { status: 500 })
    }

    return NextResponse.json({ draft }, { status: 201 })
  } catch (error) {
    console.error('POST /api/drafts error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: '创建草稿失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/drafts
 *
 * 批量删除草稿
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

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
