'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { Button } from '@/components/ui/button'
import { Loader2, Brain, Cloud, TrendingUp, Upload, Search, CheckCircle } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  // 如果已登录，重定向到 dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 已登录状态（正在重定向）
  if (user) {
    return null
  }

  // 未登录状态 - 显示落地页
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            AI 智能错题本
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            拍照识别，智能整理，高效复习
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            使用 AI 技术自动识别试卷错题，云端保存，随时随地复习。让学习更高效，让进步看得见。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => setShowLoginDialog(true)}
            >
              立即开始使用
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              了解更多
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          核心功能
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              AI 智能识别
            </h3>
            <p className="text-gray-600">
              先进的 AI 视觉技术，自动识别题目内容、学科分类、难度等级和正确答案
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Cloud className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              云端同步
            </h3>
            <p className="text-gray-600">
              所有错题自动保存到云端，手机、平板、电脑多端同步，随时随地复习
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              智能复习
            </h3>
            <p className="text-gray-600">
              记录复习次数和掌握情况，帮助你针对性复习薄弱知识点，学习更高效
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          使用流程
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                拍照上传
              </h3>
              <p className="text-gray-600 text-sm">
                用手机拍摄试卷错题，或上传已有的图片
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <Brain className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI 识别
              </h3>
              <p className="text-gray-600 text-sm">
                AI 自动识别题目内容、学科、难度和答案
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                保存复习
              </h3>
              <p className="text-gray-600 text-sm">
                确认保存到错题本，随时查看和复习
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            开始使用 AI 错题本
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            支持游客模式快速体验，无需注册即可使用
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => setShowLoginDialog(true)}
          >
            立即体验
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>AI 错题本 - 让学习更高效</p>
      </div>

      {/* Login Dialog */}
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLoginSuccess={() => router.push('/dashboard')}
      />
    </div>
  )
}
