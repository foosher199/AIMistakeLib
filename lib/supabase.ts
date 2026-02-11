/**
 * Supabase Client Configuration
 *
 * 说明：提供三种 Supabase 客户端
 * 1. Browser Client - 用于客户端组件（'use client'）
 * 2. Server Client - 用于服务端组件和 API 路由
 * 3. Admin Client - 用于服务端管理操作（绕过 RLS）
 */

import { createBrowserClient as createBrowserSupabaseClient } from '@supabase/ssr'
import { createServerClient as createServerSupabaseClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * 浏览器客户端
 *
 * 用途：客户端组件（'use client'）中使用
 * 特点：
 * - 自动管理 Cookie 中的 session
 * - 支持 RLS（Row Level Security）
 * - 用户只能访问自己的数据
 *
 * 使用示例：
 * ```tsx
 * 'use client'
 * import { createBrowserClient } from '@/lib/supabase'
 *
 * const supabase = createBrowserClient()
 * const { data } = await supabase.from('mistake_questions').select('*')
 * ```
 */
export function createBrowserClient() {
  return createBrowserSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * 服务端客户端
 *
 * 用途：服务端组件、Server Actions、API 路由
 * 特点：
 * - 从 cookies 中读取 session
 * - 支持 RLS
 * - 用户只能访问自己的数据
 *
 * 使用示例：
 * ```tsx
 * // 服务端组件
 * import { createServerClient } from '@/lib/supabase'
 *
 * export default async function Page() {
 *   const supabase = createServerClient()
 *   const { data } = await supabase.from('mistake_questions').select('*')
 *   return <div>...</div>
 * }
 * ```
 *
 * ```tsx
 * // API 路由
 * import { createServerClient } from '@/lib/supabase'
 *
 * export async function GET() {
 *   const supabase = createServerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   // ...
 * }
 * ```
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
 * 管理员客户端
 *
 * ⚠️ 警告：此客户端绕过所有 RLS 策略，拥有完全数据访问权限
 *
 * 用途：仅在服务端 API 路由中用于管理操作
 * 使用场景：
 * - 批量数据操作
 * - 管理员功能
 * - 后台任务
 *
 * 特点：
 * - 使用 Service Role Key
 * - 绕过 RLS
 * - 可以访问所有用户的数据
 * - 不自动刷新 token
 * - 不持久化 session
 *
 * ⚠️ 注意事项：
 * 1. 永远不要在客户端使用
 * 2. 谨慎使用，确保业务逻辑正确
 * 3. 始终验证用户权限
 *
 * 使用示例：
 * ```tsx
 * // API 路由（管理员操作）
 * import { createAdminClient } from '@/lib/supabase'
 *
 * export async function POST() {
 *   // 先验证管理员权限
 *   const supabase = createServerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!isAdmin(user)) {
 *     return new Response('Unauthorized', { status: 403 })
 *   }
 *
 *   // 使用管理员客户端
 *   const adminClient = createAdminClient()
 *   await adminClient.from('mistake_questions').delete().eq('spam', true)
 * }
 * ```
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
 * 辅助函数：获取当前用户（服务端）
 *
 * 用途：在服务端组件或 API 路由中快速获取当前用户
 *
 * 使用示例：
 * ```tsx
 * import { getCurrentUser } from '@/lib/supabase'
 *
 * export default async function Page() {
 *   const user = await getCurrentUser()
 *   if (!user) {
 *     redirect('/auth/signin')
 *   }
 *   return <div>Welcome {user.email}</div>
 * }
 * ```
 */
export async function getCurrentUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * 辅助函数：验证用户是否登录（服务端）
 *
 * 用途：在 API 路由中快速验证用户登录状态
 *
 * 使用示例：
 * ```tsx
 * import { requireAuth } from '@/lib/supabase'
 *
 * export async function GET() {
 *   const user = await requireAuth()
 *   if (!user) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *   // 继续处理...
 * }
 * ```
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  return user
}
