'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess?: () => void
}

export function LoginDialog({ open, onOpenChange, onLoginSuccess }: LoginDialogProps) {
  const { loginAnonymous } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  const handleAnonymousLogin = async () => {
    setLoading(true)
    try {
      const { error } = await loginAnonymous()

      if (error) {
        toast.error(error.message || '游客登录失败')
        return
      }

      toast.success('游客登录成功！')
      onOpenChange(false)
      onLoginSuccess?.()
    } catch (err) {
      console.error('Anonymous login error:', err)
      toast.error('游客登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = () => {
    onOpenChange(false)
    onLoginSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            登录 AI 错题本
          </DialogTitle>
          <DialogDescription className="text-center">
            登录后可保存识别结果到云端
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Tab 切换 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm onSuccess={handleLoginSuccess} />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm onSuccess={handleLoginSuccess} />
            </TabsContent>
          </Tabs>

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#dee5eb]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-[#626a72]">或</span>
            </div>
          </div>

          {/* 游客登录 */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAnonymousLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '游客快速体验'}
          </Button>

          <p className="mt-4 text-xs text-[#626a72] text-center">
            游客模式可快速体验，后续可绑定邮箱保存数据
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
