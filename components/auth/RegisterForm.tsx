'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { z } from 'zod'

// 注册表单验证
const RegisterSchema = z
  .object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6个字符'),
    confirmPassword: z.string().min(6, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次密码输入不一致',
    path: ['confirmPassword'],
  })

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // 验证表单
    const validation = RegisterSchema.safeParse({
      email,
      password,
      confirmPassword,
    })

    if (!validation.success) {
      const fieldErrors: {
        email?: string
        password?: string
        confirmPassword?: string
      } = {}
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as 'email' | 'password' | 'confirmPassword'
        fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password)

      if (error) {
        // 根据错误类型显示不同提示
        if (error.message.includes('User already registered')) {
          toast.error('该邮箱已被注册')
        } else if (error.message.includes('Password should be')) {
          toast.error('密码格式不符合要求')
        } else {
          toast.error(error.message || '注册失败，请重试')
        }
        return
      }

      toast.success('注册成功！')

      // 清空表单
      setEmail('')
      setPassword('')
      setConfirmPassword('')

      onSuccess?.()
    } catch (err) {
      console.error('Register error:', err)
      toast.error('注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
          邮箱
        </label>
        <Input
          id="reg-email"
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
        <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
          密码
        </label>
        <Input
          id="reg-password"
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

      <div className="space-y-2">
        <label
          htmlFor="reg-confirm-password"
          className="text-sm font-medium text-gray-700"
        >
          确认密码
        </label>
        <Input
          id="reg-confirm-password"
          type="password"
          placeholder="再次输入密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          className={errors.confirmPassword ? 'border-red-500' : ''}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-[#0070a0] hover:bg-[#005580]"
        disabled={loading}
      >
        {loading ? '注册中...' : '注册'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        注册即表示您同意我们的服务条款和隐私政策
      </p>
    </form>
  )
}
