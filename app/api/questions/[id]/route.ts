/**
 * Questions API - Update & Delete
 *
 * PATCH  /api/questions/[id] - 更新错题
 * DELETE /api/questions/[id] - 删除错题
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import {
  UpdateQuestionSchema,
  UUIDSchema,
  parseAndValidate,
  formatValidationError,
} from '@/lib/validations/question'

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

    // 删除数据（RLS 自动验证 user_id）
    const { error } = await supabase.from('mistake_questions').delete().eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/questions/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
