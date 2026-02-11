'use client'

/**
 * Authentication Hook
 *
 * 说明：封装 Supabase Auth 功能
 * 支持的认证方式：
 * 1. 匿名登录（游客快速体验）
 * 2. 邮箱密码注册
 * 3. 邮箱密码登录
 * 4. 游客绑定邮箱（转正）
 */

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  loading: boolean
  isAnonymous: boolean
  isLoggedIn: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  // 初始化：获取当前用户并监听状态变化
  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  /**
   * 匿名登录（游客快速体验）
   *
   * 特点：
   * - 无需邮箱密码
   * - 自动生成临时用户
   * - user.is_anonymous = true
   * - 可后续绑定邮箱转正
   *
   * 使用示例：
   * ```tsx
   * const { loginAnonymous } = useAuth()
   *
   * const handleGuestLogin = async () => {
   *   const { error } = await loginAnonymous()
   *   if (error) {
   *     toast.error(error.message)
   *   } else {
   *     toast.success('游客登录成功！')
   *   }
   * }
   * ```
   */
  const loginAnonymous = useCallback(async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    return { data, error }
  }, [supabase])

  /**
   * 邮箱密码注册
   *
   * 注意：暂时禁用邮箱验证
   * - 用户注册后可直接登录
   * - 无需点击验证邮件
   *
   * 使用示例：
   * ```tsx
   * const { signUp } = useAuth()
   *
   * const handleSignUp = async () => {
   *   const { error } = await signUp('user@example.com', 'password123')
   *   if (error) {
   *     toast.error(error.message)
   *   } else {
   *     toast.success('注册成功！')
   *   }
   * }
   * ```
   */
  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // 禁用邮箱验证
        },
      })
      return { data, error }
    },
    [supabase]
  )

  /**
   * 邮箱密码登录
   *
   * 使用示例：
   * ```tsx
   * const { signIn } = useAuth()
   *
   * const handleSignIn = async () => {
   *   const { error } = await signIn('user@example.com', 'password123')
   *   if (error) {
   *     toast.error('登录失败：' + error.message)
   *   }
   * }
   * ```
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    },
    [supabase]
  )

  /**
   * 退出登录
   *
   * 使用示例：
   * ```tsx
   * const { signOut } = useAuth()
   *
   * const handleSignOut = async () => {
   *   await signOut()
   *   router.push('/auth/signin')
   * }
   * ```
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [supabase])

  /**
   * 游客绑定邮箱（转正）
   *
   * 特点：
   * - 保留 user_id（历史数据不丢失）
   * - is_anonymous 自动更新为 false
   * - 可设置密码
   *
   * 使用场景：
   * - 游客创建了一些错题
   * - 希望保存数据并绑定账户
   *
   * 使用示例：
   * ```tsx
   * const { bindEmail, user } = useAuth()
   *
   * const handleBindEmail = async () => {
   *   if (!user?.is_anonymous) {
   *     toast.error('当前不是游客账户')
   *     return
   *   }
   *
   *   const { error } = await bindEmail('user@example.com', 'password123')
   *   if (error) {
   *     toast.error(error.message)
   *   } else {
   *     toast.success('绑定成功！所有数据已保留')
   *   }
   * }
   * ```
   */
  const bindEmail = useCallback(
    async (email: string, password: string) => {
      if (!user?.is_anonymous) {
        return {
          data: null,
          error: { message: '当前不是游客账户' },
        }
      }

      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      })

      return { data, error }
    },
    [supabase, user]
  )

  /**
   * 更新用户信息
   *
   * 用途：更新邮箱、密码、元数据等
   *
   * 使用示例：
   * ```tsx
   * const { updateUser } = useAuth()
   *
   * // 修改密码
   * await updateUser({ password: 'newpassword123' })
   *
   * // 修改邮箱
   * await updateUser({ email: 'newemail@example.com' })
   * ```
   */
  const updateUser = useCallback(
    async (attributes: {
      email?: string
      password?: string
      data?: Record<string, any>
    }) => {
      const { data, error } = await supabase.auth.updateUser(attributes)
      return { data, error }
    },
    [supabase]
  )

  /**
   * 重置密码（发送重置邮件）
   *
   * 使用示例：
   * ```tsx
   * const { resetPassword } = useAuth()
   *
   * const handleResetPassword = async () => {
   *   const { error } = await resetPassword('user@example.com')
   *   if (!error) {
   *     toast.success('密码重置邮件已发送')
   *   }
   * }
   * ```
   */
  const resetPassword = useCallback(
    async (email: string) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      return { data, error }
    },
    [supabase]
  )

  return {
    // 状态
    user,
    loading,
    isAnonymous: user?.is_anonymous ?? false,
    isLoggedIn: !!user,

    // 认证方法
    loginAnonymous,
    signUp,
    signIn,
    signOut,
    bindEmail,
    updateUser,
    resetPassword,
  }
}

/**
 * 辅助 Hook：要求用户登录
 *
 * 用途：在受保护的页面中使用，未登录则跳转
 *
 * 使用示例：
 * ```tsx
 * 'use client'
 *
 * export default function ProtectedPage() {
 *   const { user, loading } = useRequireAuth()
 *
 *   if (loading) return <Loading />
 *
 *   return <div>欢迎 {user.email}</div>
 * }
 * ```
 */
export function useRequireAuth() {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.loading && !auth.isLoggedIn) {
      // 未登录，跳转到登录页
      window.location.href = '/auth/signin'
    }
  }, [auth.loading, auth.isLoggedIn])

  return auth
}
