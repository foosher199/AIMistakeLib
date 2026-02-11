'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { z } from 'zod'

// 绑定邮箱表单验证
const BindEmailSchema = z
  .object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6个字符'),
    confirmPassword: z.string().min(6, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次密码输入不一致',
    path: ['confirmPassword'],
  })

interface BindEmailFormProps {
  onSuccess?: () => void
}

export function BindEmailForm({ onSuccess }: BindEmailFormProps) {
  const { bindEmail, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // 如果不是游客用户，不显示此表单
  if (!user?.is_anonymous) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // 验证表单
    const validation = BindEmailSchema.safeParse({
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
      const { error } = await bindEmail(email, password)

      if (error) {
        // 根据错误类型显示不同提示
        if (error.message.includes('Email already exists')) {
          toast.error('该邮箱已被使用')
        } else if (error.message.includes('not an anonymous account')) {
          toast.error('当前不是游客账户')
        } else {
          toast.error(error.message || '绑定失败，请重试')
        }
        return
      }

      toast.success('绑定成功！您的数据已保留')

      // 清空表单
      setEmail('')
      setPassword('')
      setConfirmPassword('')

      // 调用成功回调
      onSuccess?.()
    } catch (err) {
      console.error('Bind email error:', err)
      toast.error('绑定失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>游客模式</strong>：您当前以游客身份使用，绑定邮箱后可以：
        </p>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>永久保存您的所有错题数据</li>
          <li>在任何设备上登录访问</li>
          <li>不会丢失任何已有数据</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="bind-email" className="text-sm font-medium text-gray-700">
            绑定邮箱
          </label>
          <Input
            id="bind-email"
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
          <label
            htmlFor="bind-password"
            className="text-sm font-medium text-gray-700"
          >
            设置密码
          </label>
          <Input
            id="bind-password"
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
            htmlFor="bind-confirm-password"
            className="text-sm font-medium text-gray-700"
          >
            确认密码
          </label>
          <Input
            id="bind-confirm-password"
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
          {loading ? '绑定中...' : '绑定邮箱'}
        </Button>
      </form>
    </div>
  )
}
