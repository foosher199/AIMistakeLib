'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { QuestionList } from '@/components/questions/QuestionList'
import { QuestionStats } from '@/components/questions/QuestionStats'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { Button } from '@/components/ui/button'
import type { Question } from '@/types/database'
import { Plus, Loader2 } from 'lucide-react'

export default function QuestionsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>()

  // 检查登录状态
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // 加载中或未登录时显示加载状态
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingQuestion(undefined)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      // 关闭时清空编辑状态
      setEditingQuestion(undefined)
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1f1f1f] mb-2">错题列表</h1>
          <p className="text-[#626a72]">管理和复习你的错题</p>
        </div>

        <Button
          onClick={handleAdd}
          className="bg-[#0070a0] hover:bg-[#005580]"
        >
          <Plus className="w-4 h-4 mr-2" />
          手动添加
        </Button>
      </div>

      {/* 统计卡片 */}
      <QuestionStats />

      {/* 题目列表 */}
      <QuestionList onEdit={handleEdit} />

      {/* 题目表单 */}
      <QuestionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        question={editingQuestion}
      />
    </div>
  )
}
