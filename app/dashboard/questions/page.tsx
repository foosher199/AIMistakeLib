'use client'

import { useState } from 'react'
import { QuestionList } from '@/components/questions/QuestionList'
import { QuestionStats } from '@/components/questions/QuestionStats'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { Button } from '@/components/ui/button'
import type { Question } from '@/types/database'
import { Plus } from 'lucide-react'

export default function QuestionsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>()

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
