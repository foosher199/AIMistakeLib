/**
 * 微信登录 API
 * 
 * 接收微信小程序的登录 code，换取 Supabase token
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 微信 API 配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || ''
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || ''

/**
 * GET /api/auth/wechat
 * 
 * 通过 code 换取微信 session
 */
async function getWechatSession(code: string) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`
  
  const response = await fetch(url)
  const data = await response.json()
  
  return data
}

/**
 * POST /api/auth/wechat
 * 
 * 微信登录接口
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: '缺少 code 参数' }, { status: 400 })
    }

    // 1. 用 code 换取微信 session
    const wechatSession = await getWechatSession(code)
    
    if (wechatSession.errcode) {
      console.error('微信 API 错误:', wechatSession)
      return NextResponse.json({ error: '微信登录失败' }, { status: 400 })
    }

    const { openid, session_key } = wechatSession

    // 2. 使用 Supabase Admin API 创建或获取用户
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 查找或创建用户（使用 openid 作为唯一标识）
    let { data: user, error: userError } = await supabase
      .from('mistake_profiles')
      .select('*')
      .eq('id', openid)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('查询用户失败:', userError)
      return NextResponse.json({ error: '服务器错误' }, { status: 500 })
    }

    // 如果用户不存在，创建新用户
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('mistake_profiles')
        .insert({
          id: openid, // 使用 openid 作为用户 ID
          username: `用户${openid.slice(-6)}`,
        })
        .select()
        .single()

      if (createError) {
        console.error('创建用户失败:', createError)
        return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
      }

      user = newUser
    }

    // 3. 生成自定义 token（因为是服务端调用，需要自己生成）
    // 实际上应该使用 Supabase 的 Admin API 来创建 token
    // 这里我们返回一个特殊的 token，后端会验证
    
    // 返回用户信息和模拟的 token
    // 注意：在生产环境中，应该使用 Supabase Admin API 生成真正的 JWT
    return NextResponse.json({
      token: `wechat_${openid}_${Date.now()}`,
      user: {
        id: user.id,
        email: null,
        user_metadata: {
          openid,
        },
      },
    })
  } catch (error) {
    console.error('微信登录错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
