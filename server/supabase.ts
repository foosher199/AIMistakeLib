/**
 * Supabase server clients
 * 仅用于服务端（Server Components, API Routes）
 */

import { createServerClient as createServerSupabaseClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

/**
 * 服务端客户端（Cookie-based认证，用于Web端）
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createServerSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 在 Server Components 中 set cookies 可能失败
            // 这是预期行为，可以忽略
          }
        },
      },
    }
  )
}

/**
 * API路由客户端（支持Bearer Token认证，用于iOS/Android客户端）
 * 从Authorization header中提取Bearer token进行认证
 */
export async function createApiClient(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!accessToken) {
    return null
  }

  // 创建带Bearer Token的客户端
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * 获取已认证的 Supabase 客户端和当前用户
 * 优先尝试Bearer Token（iOS/Android），回退到Cookie认证（Web）
 */
export async function getAuthClient(request: NextRequest): Promise<{ supabase: SupabaseClient<Database>; user: User } | null> {
  // 优先尝试Bearer Token认证（iOS/Android）
  const apiClient = await createApiClient(request)
  if (apiClient) {
    const { data: { user }, error } = await apiClient.auth.getUser()
    if (!error && user) {
      return { supabase: apiClient, user }
    }
  }

  // 回退到Cookie认证（Web）
  const serverClient = await createServerClient()
  const { data: { user }, error } = await serverClient.auth.getUser()

  if (error || !user) {
    return null
  }

  return { supabase: serverClient, user }
}

/**
 * 获取当前用户（支持Cookie和Bearer Token两种方式）
 */
export async function getCurrentUser(request?: NextRequest) {
  // 优先尝试Bearer Token（iOS/Android客户端）
  if (request) {
    const apiClient = await createApiClient(request)
    if (apiClient) {
      const { data: { user }, error } = await apiClient.auth.getUser()
      if (!error && user) {
        return user
      }
    }
  }

  // 回退到Cookie认证（Web端）
  const serverClient = await createServerClient()
  const { data: { user }, error } = await serverClient.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * 管理员客户端
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * 验证用户是否登录
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  return user
}
