'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCreateFeedback, type FeedbackCategory } from '@/hooks/useFeedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const FEEDBACK_CATEGORIES = [
  {
    id: 'bug' as FeedbackCategory,
    label: '问题反馈',
    icon: Bug,
    color: '#f43f5e',
    bgColor: '#ffe4e6',
    description: '报告使用中遇到的错误或问题',
  },
  {
    id: 'feature' as FeedbackCategory,
    label: '功能建议',
    icon: Lightbulb,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    description: '建议新增的功能或特性',
  },
  {
    id: 'improvement' as FeedbackCategory,
    label: '改进建议',
    icon: Sparkles,
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    description: '对现有功能的改进意见',
  },
  {
    id: 'other' as FeedbackCategory,
    label: '其他',
    icon: MessageSquare,
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: '其他意见或建议',
  },
]

export default function FeedbackPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const createFeedback = useCreateFeedback()
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [email, setEmail] = useState(user?.email || '')

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !content.trim()) {
      return
    }

    await createFeedback.mutateAsync({
      category,
      subject: subject.trim(),
      content: content.trim(),
      email: email.trim() || undefined,
    })

    // 提交成功后清空表单
    setSubject('')
    setContent('')
    setCategory('bug')
  }

  // 加载中或未登录时显示加载状态
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3b82f6] animate-spin mx-auto mb-4" />
          <p className="text-[#64748b]">加载中...</p>
        </div>
      </div>
    )
  }

  const selectedCategory = FEEDBACK_CATEGORIES.find((c) => c.id === category)

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      {/* 头部 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#172b4d] mb-2">意见反馈</h1>
        <p className="text-[#64748b]">
          您的反馈对我们非常重要，帮助我们改进产品
        </p>
      </div>

      {/* 提示卡片 */}
      <div className="rounded-[22px] border border-[#bfdbfe] bg-[#eff6ff]/70 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#172b4d]">
            <p className="font-medium mb-1">反馈提示</p>
            <ul className="space-y-1 text-[#64748b]">
              <li>• 请尽可能详细地描述您遇到的问题或建议</li>
              <li>• 如果是问题反馈，请提供复现步骤和截图（如有）</li>
              <li>• 我们会认真对待每一条反馈</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 反馈表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 反馈类型选择 */}
        <div className="rounded-[22px] border border-[#dce8f3] bg-white p-6 shadow-[0_10px_28px_rgba(58,108,150,0.06)]">
          <h2 className="text-lg font-semibold text-[#172b4d] mb-4">
            反馈类型
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {FEEDBACK_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isSelected = category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(58,108,150,0.06)] ${
                    isSelected
                      ? 'border-[#3b82f6] bg-[#eff6ff]/20'
                      : 'border-[#dce8f3] hover:border-[#bfdbfe]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: cat.bgColor }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <span className="font-medium text-[#172b4d]">
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-sm text-[#64748b]">{cat.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 反馈内容 */}
        <div className="rounded-[22px] border border-[#dce8f3] bg-white p-6 shadow-[0_10px_28px_rgba(58,108,150,0.06)] space-y-4">
          <h2 className="text-lg font-semibold text-[#172b4d]">反馈内容</h2>

          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium text-[#172b4d] mb-2">
              主题 <span className="text-red-500">*</span>
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="简要描述您的问题或建议"
              className="h-12 rounded-xl border-[#dce8f3] bg-[#fbfdff] focus:border-[#3b82f6]"
              required
              maxLength={100}
            />
            <p className="text-xs text-[#64748b] mt-1">
              {subject.length}/100 字符
            </p>
          </div>

          {/* 详细描述 */}
          <div>
            <label className="block text-sm font-medium text-[#172b4d] mb-2">
              详细描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请详细描述您遇到的问题或建议的内容..."
              className="w-full min-h-[200px] rounded-xl border border-[#dce8f3] bg-[#fbfdff] p-3 focus:outline-none focus:border-[#3b82f6] resize-y"
              required
              maxLength={1000}
            />
            <p className="text-xs text-[#64748b] mt-1">
              {content.length}/1000 字符
            </p>
          </div>

          {/* 联系邮箱 */}
          <div>
            <label className="block text-sm font-medium text-[#172b4d] mb-2">
              联系邮箱
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="用于接收反馈处理结果（可选）"
              className="h-12 rounded-xl border-[#dce8f3] bg-[#fbfdff] focus:border-[#3b82f6]"
            />
            <p className="text-xs text-[#64748b] mt-1">
              {user?.email
                ? '已自动填充您的账号邮箱'
                : '提供邮箱后我们可以及时回复您'}
            </p>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 h-12"
            disabled={
              !subject.trim() ||
              !content.trim() ||
              createFeedback.isPending
            }
          >
            {createFeedback.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                提交反馈
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 预览卡片 */}
      {(subject || content) && (
        <div className="rounded-[22px] border border-[#dce8f3] bg-white p-6 shadow-[0_10px_28px_rgba(58,108,150,0.06)]">
          <h3 className="text-lg font-semibold text-[#172b4d] mb-4">
            反馈预览
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <>
                  <div
                    className="w-8 h-8 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: selectedCategory.bgColor }}
                  >
                    <selectedCategory.icon
                      className="w-4 h-4"
                      style={{ color: selectedCategory.color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[#172b4d]">
                    {selectedCategory.label}
                  </span>
                </>
              )}
            </div>
            {subject && (
              <div>
                <p className="text-sm text-[#64748b] mb-1">主题：</p>
                <p className="font-medium text-[#172b4d]">{subject}</p>
              </div>
            )}
            {content && (
              <div>
                <p className="text-sm text-[#64748b] mb-1">内容：</p>
                <p className="text-[#172b4d] whitespace-pre-wrap">{content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
