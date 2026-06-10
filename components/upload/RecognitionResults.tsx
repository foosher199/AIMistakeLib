'use client'

import { useState } from 'react'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { SUBJECTS, DIFFICULTIES } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { CheckCircle, Edit, Trash2, AlertCircle, Copy, Check } from 'lucide-react'
import { useCreateQuestion } from '@/hooks/useQuestions'
import { toast } from 'sonner'

interface RecognitionResultsProps {
  results: AIRecognitionResult[]
  draftIds?: string[] // 与 results 一一对应的草稿ID，空字符串表示无草稿
  onEdit?: (result: AIRecognitionResult, index: number) => void
  onDelete?: (index: number) => void
  onClear?: () => void
  onSaveDraft?: (draftId: string) => void
  onDeleteDraft?: (draftId: string) => void
  savingDraftId?: string | null
  deletingDraftId?: string | null
}

export function RecognitionResults({
  results,
  draftIds,
  onEdit,
  onDelete,
  onClear,
  onSaveDraft,
  onDeleteDraft,
  savingDraftId,
  deletingDraftId,
}: RecognitionResultsProps) {
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const createQuestion = useCreateQuestion()

  const getDraftId = (index: number): string | undefined => {
    return draftIds?.[index]
  }

  const handleSave = async (result: AIRecognitionResult, index: number) => {
    const draftId = getDraftId(index)

    if (draftId) {
      // 有草稿ID，走草稿保存流程
      onSaveDraft?.(draftId)
      return
    }

    // 无草稿ID，直接创建题目（兼容旧逻辑）
    const questionData = {
      content: result.content,
      subject: result.subject,
      category: result.category,
      difficulty: result.difficulty,
      answer: result.answer,
      explanation: result.explanation,
      user_answer: undefined,
      image_url: undefined,
    }

    try {
      await createQuestion.mutateAsync(questionData as unknown as import('@/types/database').QuestionInsert)
      setSavedIndices((prev) => new Set(prev).add(index))
    } catch (error) {
      console.error('Save question error:', error)
    }
  }

  const handleSaveAll = async () => {
    for (let i = 0; i < results.length; i++) {
      if (!savedIndices.has(i)) {
        await handleSave(results[i], i)
      }
    }
  }

  const handleDelete = (index: number) => {
    const draftId = getDraftId(index)
    if (draftId) {
      onDeleteDraft?.(draftId)
      return
    }
    onDelete?.(index)
  }

  const handleCopy = async (result: AIRecognitionResult, index: number) => {
    const subjectLabel = SUBJECTS.find((s) => s.id === result.subject)?.label || result.subject
    const difficultyLabel = DIFFICULTIES.find((d) => d.id === result.difficulty)?.label || result.difficulty

    const text = `【学科】${subjectLabel}
【难度】${difficultyLabel}
【分类】${result.category}

【题目】
${result.content}

【答案】
${result.answer}${result.explanation ? `\n\n【解析】\n${result.explanation}` : ''}`

    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('题目已复制到剪贴板')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  if (results.length === 0) {
    return null
  }

  const allSaved = savedIndices.size === results.length
  const isSaving = savingDraftId != null

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          识别结果 ({results.length} 道题目)
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAll}
            disabled={allSaved || isSaving}
          >
            {isSaving ? '待确认...' : '全部保存'}
          </Button>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

      {/* 结果列表 */}
      <div className="space-y-4">
        {results.map((result, index) => {
          const draftId = getDraftId(index)
          const isSaved = savedIndices.has(index)
          const isCurrentSaving = savingDraftId === draftId
          const isCurrentDeleting = deletingDraftId === draftId
          const subjectLabel = SUBJECTS.find((s) => s.id === result.subject)?.label || result.subject
          const difficultyLabel = DIFFICULTIES.find((d) => d.id === result.difficulty)?.label || result.difficulty
          const difficultyColor = {
            easy: 'bg-green-100 text-green-800 border-green-300',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            hard: 'bg-red-100 text-red-800 border-red-300',
          }[result.difficulty]

          return (
            <div
              key={index}
              className={`bg-white rounded-lg border ${
                isSaved ? 'border-green-300 bg-green-50' : 'border-gray-200'
              } p-4 space-y-3`}
            >
              {/* 头部标签 */}
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    {subjectLabel}
                  </Badge>
                  <Badge variant="outline" className={difficultyColor}>
                    {difficultyLabel}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                    {result.category}
                  </Badge>
                  {result.confidence && (
                    <Badge
                      variant="outline"
                      className={
                        result.confidence >= 0.8
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : result.confidence >= 0.6
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          : 'bg-red-100 text-red-700 border-red-300'
                      }
                    >
                      置信度: {(result.confidence * 100).toFixed(0)}%
                    </Badge>
                  )}
                  {isSaved && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已保存
                    </Badge>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(result, index)}
                    className="h-8 w-8 p-0"
                    title="复制题目"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  {!isSaved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSave(result, index)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="保存"
                      disabled={isCurrentSaving}
                    >
                      {isCurrentSaving ? (
                        <Check className="w-4 h-4 animate-pulse" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  {!isSaved && onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(result, index)}
                      className="h-8 w-8 p-0"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="删除"
                    disabled={isCurrentDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 题目内容 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">题目：</p>
                <p className="text-gray-900 whitespace-pre-wrap">{result.content}</p>
              </div>

              {/* 答案 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">答案：</p>
                <p className="text-gray-900 bg-green-50 p-2 rounded">{result.answer}</p>
              </div>

              {/* 解析 */}
              {result.explanation && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">解析：</p>
                  <p className="text-gray-700 bg-blue-50 p-2 rounded whitespace-pre-wrap">
                    {result.explanation}
                  </p>
                </div>
              )}

              {/* 低置信度警告 */}
              {result.confidence && result.confidence < 0.6 && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">识别置信度较低</p>
                    <p className="text-xs mt-1">建议检查识别内容是否准确，必要时手动编辑</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 确认清空对话框 */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认清空</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            确定要清空所有识别结果吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowClearConfirm(false)
                onClear?.()
              }}
            >
              确认清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
