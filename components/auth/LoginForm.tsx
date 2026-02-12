'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { z } from 'zod'

// 登录表单验证
const LoginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
})

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // 验证表单
    const validation = LoginSchema.safeParse({ email, password })

    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as 'email' | 'password'
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // 根据错误类型显示不同提示
        if (error.message.includes('Invalid login credentials')) {
          toast.error('邮箱或密码错误')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('请先验证邮箱')
        } else {
          toast.error(error.message || '登录失败，请重试')
        }
        return
      }

      toast.success('登录成功！')
      onSuccess?.()
    } catch (err) {
      console.error('Login error:', err)
      toast.error('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          邮箱
        </label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          密码
        </label>
        <Input
          id="password"
          type="password"
          placeholder="至少6个字符"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-[#0070a0] hover:bg-[#005580]"
        disabled={loading}
      >
        {loading ? '登录中...' : '登录'}
      </Button>
    </form>
  )
}
