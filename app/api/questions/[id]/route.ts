/**
 * Questions API - Update & Delete
 *
 * PATCH  /api/questions/[id] - 更新错题
 * DELETE /api/questions/[id] - 删除错题
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthClient } from '@/server/supabase'
import { attachSignedQuestionImages } from '@/server/images'
import {
  UpdateQuestionSchema,
  UUIDSchema,
  parseAndValidate,
  formatValidationError,
} from '@/contracts/question'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUIDSchema.safeParse(id).success) {
    return NextResponse.json({ error: '无效的错题ID' }, { status: 400 })
  }
  const { data: question, error } = await auth.supabase
    .from('mistake_questions')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !question) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const [result] = await attachSignedQuestionImages([question], auth.user.id)
  return NextResponse.json({ question: result })
}

/**
 * PATCH /api/questions/[id]
 *
 * 请求体：
 * {
 *   content?: string,
 *   subject?: string,
 *   category?: string,
 *   difficulty?: 'easy' | 'medium' | 'hard',
 *   answer?: string,
 *   user_answer?: string,
 *   explanation?: string,
 *   image_url?: string,
 *   review_count?: number,
 *   is_mastered?: boolean,
 *   last_reviewed?: string
 * }
 *
 * 响应：
 * {
 *   question: Question
 * }
 */
export async function PATCH(
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

    // 解析请求体
    const body = await request.json()

    // 验证数据
    const validationResult = parseAndValidate(UpdateQuestionSchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatValidationError(validationResult.error) },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // 更新数据（RLS 自动验证 user_id，确保只能更新自己的错题）
    const { data: question, error } = await supabase
      .from('mistake_questions')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      // 如果是 RLS 阻止（没有权限或不存在），返回 404
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
    console.error('PATCH /api/questions/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/questions/[id]
 *
 * 响应：
 * {
 *   success: true
 * }
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
    const { supabase } = authResult

    // 验证 ID 格式
    const { id } = await params
    const idValidation = UUIDSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json({ error: '无效的错题ID' }, { status: 400 })
    }

    const { data: ownedQuestion } = await supabase
      .from('mistake_questions')
      .select('id')
      .eq('id', id)
      .single()
    if (!ownedQuestion) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: links } = await admin
      .from('mistake_question_images')
      .select('image_id')
      .eq('question_id', id)

    // 删除数据（关联记录由外键级联删除）
    const { error } = await supabase.from('mistake_questions').delete().eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const link of links || []) {
      const [{ count: linkCount }, { count: draftCount }] = await Promise.all([
        admin.from('mistake_question_images').select('*', { count: 'exact', head: true }).eq('image_id', link.image_id),
        admin.from('mistake_drafts').select('*', { count: 'exact', head: true }).eq('source_image_id', link.image_id),
      ])
      if ((linkCount || 0) === 0 && (draftCount || 0) === 0) {
        await admin.from('mistake_images').update({ status: 'orphaned', updated_at: new Date().toISOString() }).eq('id', link.image_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/questions/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
