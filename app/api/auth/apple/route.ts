/**
 * Apple Sign-In API
 *
 * POST /api/auth/apple - 使用 Apple ID token 登录/注册
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/server/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken, nonce } = body

    if (!idToken) {
      return NextResponse.json(
        { error: '缺少 Apple ID Token' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 使用 Apple ID token 通过 Supabase 进行认证
    // Apple provider: { id_token, nonce?, apple_authorization_code? }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      nonce: nonce || undefined,
    })

    if (error) {
      console.error('Apple sign-in error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: '认证失败' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    console.error('POST /api/auth/apple error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
