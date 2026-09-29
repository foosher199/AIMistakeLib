/**
 * Profile API - 用户资料
 *
 * GET  /api/profile - 获取当前用户资料
 * PATCH /api/profile - 更新用户资料
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'

/**
 * GET /api/profile
 *
 * 获取当前用户的资料
 */
export async function GET(request: NextRequest) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

    // 获取用户资料
    const { data: profile, error } = await supabase
      .from('mistake_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      // 如果资料不存在，返回基本信息
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          profile: {
            id: user.id,
            username: null,
            avatar_url: null,
            created_at: user.created_at,
            updated_at: user.created_at,
          }
        })
      }
      console.error('[API] 获取用户资料失败:', error)
      return NextResponse.json({ error: '获取用户资料失败' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('GET /api/profile error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: '获取用户资料失败' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 *
 * 更新用户资料
 * Body: {
 *   username?: string,
 *   avatar_url?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
    const authResult = await getAuthClient(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { supabase, user } = authResult

    const body = await request.json()
    const { username, avatar_url } = body

    // 检查资料是否存在
    const { data: existingProfile } = await supabase
      .from('mistake_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    let profile
    if (existingProfile) {
      // 更新现有资料
      const { data: updatedProfile, error: updateError } = await supabase
        .from('mistake_profiles')
        .update({
          username: username ?? existingProfile.username,
          avatar_url: avatar_url ?? existingProfile.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('[API] 更新用户资料失败:', updateError)
        return NextResponse.json({ error: '更新用户资料失败' }, { status: 500 })
      }

      profile = updatedProfile
    } else {
      // 创建新资料
      const { data: newProfile, error: insertError } = await supabase
        .from('mistake_profiles')
        .insert({
          id: user.id,
          username,
          avatar_url,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[API] 创建用户资料失败:', insertError)
        return NextResponse.json({ error: '创建用户资料失败' }, { status: 500 })
      }

      profile = newProfile
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('PATCH /api/profile error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: '更新用户资料失败' }, { status: 500 })
  }
}
