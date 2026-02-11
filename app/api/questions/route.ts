/**
 * Questions API - List & Create
 *
 * GET  /api/questions - 查询用户的错题列表
 * POST /api/questions - 创建新错题
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import {
  CreateQuestionSchema,
  QueryQuestionsSchema,
  parseAndValidate,
  formatValidationError,
} from '@/lib/validations/question'

/**
 * GET /api/questions
 *
 * 查询参数：
 * - subject: 按学科筛选
 * - difficulty: 按难度筛选
 * - is_mastered: 按掌握状态筛选
 * - search: 模糊搜索（题目内容或分类）
 * - limit: 分页数量（默认50，最大1000）
 * - offset: 分页偏移（默认0）
 *
 * 响应：
 * {
 *   questions: Question[],
 *   total: number
 * }
 */
export async function GET(request: NextRequest) {
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

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams)

    const validationResult = parseAndValidate(QueryQuestionsSchema, params)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatValidationError(validationResult.error) },
        { status: 400 }
      )
    }

    const { subject, difficulty, is_mastered, search, limit, offset } = validationResult.data

    // 构建查询（RLS 自动过滤 user_id）
    let query = supabase
      .from('mistake_questions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 添加筛选条件
    if (subject) {
      query = query.eq('subject', subject)
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    if (is_mastered !== undefined) {
      query = query.eq('is_mastered', is_mastered)
    }
    if (search) {
      // 使用 ilike 进行模糊搜索（不区分大小写）
      query = query.or(`content.ilike.%${search}%,category.ilike.%${search}%`)
    }

    const { data: questions, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      questions: questions || [],
      total: count ?? 0,
    })
  } catch (error) {
    console.error('GET /api/questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/questions
 *
 * 请求体：
 * {
 *   content: string,
 *   subject: string,
 *   category: string,
 *   difficulty: 'easy' | 'medium' | 'hard',
 *   answer: string,
 *   user_answer?: string,
 *   explanation?: string,
 *   image_url?: string
 * }
 *
 * 响应：
 * {
 *   question: Question
 * }
 */
export async function POST(request: NextRequest) {
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

    // 解析请求体
    const body = await request.json()

    // 验证数据
    const validationResult = parseAndValidate(CreateQuestionSchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatValidationError(validationResult.error) },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // 插入数据（RLS 会自动验证 user_id）
    const { data: question, error } = await supabase
      .from('mistake_questions')
      .insert({
        ...validatedData,
        user_id: user.id, // 手动添加 user_id
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('POST /api/questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
