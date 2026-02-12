'use client'

import { useState } from 'react'
import type { Question } from '@/types/database'
import { SUBJECTS, DIFFICULTIES } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { useDeleteQuestion, useReviewQuestion, useMasterQuestion } from '@/hooks/useQuestions'
import { formatDistanceToNow } from '@/lib/utils'

interface QuestionCardProps {
  question: Question
  onEdit?: (question: Question) => void
  onView?: (question: Question) => void
}

export function QuestionCard({ question, onEdit, onView }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const deleteQuestion = useDeleteQuestion()
  const reviewQuestion = useReviewQuestion()
  const masterQuestion = useMasterQuestion()

  // 获取学科和难度的中文显示
  const subjectLabel = SUBJECTS.find((s) => s.id === question.subject)?.label || question.subject
  const difficultyLabel = DIFFICULTIES.find((d) => d.id === question.difficulty)?.label || question.difficulty
  const difficultyColor = {
    easy: 'bg-[#d1fae5] text-[#10b981] border-[#10b981]/30',
    medium: 'bg-[#fef3c7] text-[#f59e0b] border-[#f59e0b]/30',
    hard: 'bg-[#ffe4e6] text-[#f43f5e] border-[#f43f5e]/30',
  }[question.difficulty]

  const handleDelete = () => {
    if (confirm('确定要删除这道题目吗？')) {
      deleteQuestion.mutate(question.id)
    }
  }

  const handleReview = () => {
    reviewQuestion.mutate(question.id)
  }

  const handleMaster = () => {
    if (question.is_mastered) {
      return
    }
    masterQuestion.mutate(question.id)
  }

  return (
    <div className="bg-white rounded-lg border border-[#dee5eb] shadow-sm hover:shadow-md transition-shadow p-4">
      {/* 头部：标签和操作 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-[#cce5f3] text-[#0070a0] border-[#0070a0]/30">
            {subjectLabel}
          </Badge>
          <Badge variant="outline" className={difficultyColor}>
            {difficultyLabel}
          </Badge>
          {question.is_mastered && (
            <Badge variant="outline" className="bg-[#d1fae5] text-[#10b981] border-[#10b981]/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              已掌握
            </Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(question)}>
              <Eye className="w-4 h-4 mr-2" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReview}>
              <RefreshCw className="w-4 h-4 mr-2" />
              记录复习
            </DropdownMenuItem>
            {!question.is_mastered && (
              <DropdownMenuItem onClick={handleMaster}>
                <CheckCircle className="w-4 h-4 mr-2" />
                标记掌握
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit?.(question)}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-[#f43f5e] focus:text-[#f43f5e]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 题目内容 */}
      <div className="mb-3">
        <p className="text-sm text-[#626a72] mb-1">{question.category}</p>
        <p className="text-[#1f1f1f] whitespace-pre-wrap">{question.content}</p>
      </div>

      {/* 图片（如果有） */}
      {question.image_url && (
        <div className="mb-3">
          <img
            src={question.image_url}
            alt="题目图片"
            className="max-w-full h-auto rounded border border-[#dee5eb]"
          />
        </div>
      )}

      {/* 答案区域 */}
      <div className="border-t border-[#dee5eb] pt-3 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAnswer(!showAnswer)}
          className="text-[#0070a0] hover:text-[#004968]"
        >
          {showAnswer ? '隐藏答案' : '显示答案'}
        </Button>

        {showAnswer && (
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-sm font-medium text-[#626a72]">正确答案：</p>
              <p className="text-[#1f1f1f] bg-[#d1fae5]/30 p-2 rounded">
                {question.answer}
              </p>
            </div>

            {question.user_answer && (
              <div>
                <p className="text-sm font-medium text-[#626a72]">我的答案：</p>
                <p className="text-[#1f1f1f] bg-[#ffe4e6]/30 p-2 rounded">
                  {question.user_answer}
                </p>
              </div>
            )}

            {question.explanation && (
              <div>
                <p className="text-sm font-medium text-[#626a72]">答案解析：</p>
                <p className="text-[#626a72] bg-[#cce5f3]/30 p-2 rounded whitespace-pre-wrap">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-[#626a72]">
        <div className="flex items-center gap-4">
          <span>复习 {question.review_count} 次</span>
          {question.last_reviewed && (
            <span>
              最近复习：{formatDistanceToNow(question.last_reviewed)}
            </span>
          )}
        </div>
        <span>{formatDistanceToNow(question.created_at)}</span>
      </div>
    </div>
  )
}
