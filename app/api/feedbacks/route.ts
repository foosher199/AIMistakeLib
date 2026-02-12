import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
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

    // 获取用户信息（如果已登录）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 插入反馈
    const { data, error } = await supabase
      .from('mistake_feedbacks')
      .insert({
        user_id: user?.id || null,
        email: email || user?.email || null,
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

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()

    // 获取用户信息
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

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

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
