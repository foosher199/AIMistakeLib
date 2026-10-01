'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { QuestionList } from '@/components/questions/QuestionList'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { Button } from '@/components/ui/button'
import type { Question } from '@/types/database'
import { FileText, Plus, Loader2 } from 'lucide-react'

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
          <Loader2 className="w-12 h-12 text-[#3b82f6] animate-spin mx-auto mb-4" />
          <p className="text-[#64748b]">加载中...</p>
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
    <div>
      <section className="rounded-[28px] border border-[#dce7f5] bg-white p-5 shadow-[0_14px_40px_rgba(30,64,100,0.07)] sm:p-6">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)]">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172b4d]">错题列表</h1>
          </div>

          <Button
            onClick={handleAdd}
            variant="jelly"
            className="rounded-full px-6"
          >
            <Plus className="mr-2 h-4 w-4" />
            手动添加
          </Button>
        </div>

        {/* 题目列表 */}
        <QuestionList onEdit={handleEdit} />
      </section>

      {/* 题目表单 */}
      <QuestionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        question={editingQuestion}
      />
    </div>
  )
}
