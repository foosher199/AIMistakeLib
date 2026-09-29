import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient, createAdminClient } from '@/server/supabase'

export async function POST(request: NextRequest) {
  try {
    // POST 允许匿名反馈，使用 admin client 绕过 RLS
    // 但如果带了 Authorization header，则尝试解析用户
    let userId: string | null = null
    let userEmail: string | null = null
    const authHeader = request.headers.get('Authorization')

    if (authHeader?.startsWith('Bearer ')) {
      const authResult = await getAuthClient(request)
      if (authResult) {
        userId = authResult.user.id
        userEmail = authResult.user.email || null
      }
    }

    const body = await request.json()
    const { category, subject, content, email } = body

    // 验证必填字段
    if (!category || !subject || !content) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证 category
    const validCategories = ['bug', 'feature', 'improvement', 'other']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: '无效的反馈类型' },
        { status: 400 }
      )
    }

    // 使用 admin client 插入反馈（绕过 RLS 因为需要支持匿名）
    const supabase = createAdminClient()

    // 插入反馈
    const { data, error } = await supabase
      .from('mistake_feedbacks')
      .insert({
        user_id: userId,
        email: email || userEmail || null,
        category,
        subject,
        content,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create feedback:', error)
      return NextResponse.json(
        { error: '提交反馈失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ feedback: data })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }
    const { supabase, user } = authResult

    // 查询用户的反馈
    const { data, error } = await supabase
      .from('mistake_feedbacks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch feedbacks:', error)
      return NextResponse.json(
        { error: '获取反馈列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ feedbacks: data })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
