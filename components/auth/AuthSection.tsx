'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { BindEmailForm } from './BindEmailForm'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function AuthSection() {
  const { loginAnonymous, user, isAnonymous } = useAuth()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'bind'>('login')

  // 如果是游客用户，显示绑定邮箱界面
  if (user && isAnonymous) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AI 错题本
              </h1>
              <p className="text-gray-600">绑定邮箱，永久保存数据</p>
            </div>

            <BindEmailForm onSuccess={() => setActiveTab('login')} />

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                暂时跳过，继续使用游客模式
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 未登录用户，显示登录/注册界面
  const handleAnonymousLogin = async () => {
    setLoading(true)
    try {
      const { error } = await loginAnonymous()

      if (error) {
        toast.error(error.message || '游客登录失败')
        return
      }

      toast.success('游客登录成功！')
    } catch (err) {
      console.error('Anonymous login error:', err)
      toast.error('游客登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 标题 */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI 错题本
            </h1>
            <p className="text-gray-600">智能识别，科学复习</p>
          </div>

          {/* Tab 切换 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">或</span>
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

          <p className="mt-4 text-xs text-gray-500 text-center">
            游客模式可快速体验，后续可绑定邮箱保存数据
          </p>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2024 AI 错题本 - 让学习更高效</p>
        </div>
      </div>
    </div>
  )
}
