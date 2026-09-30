'use client'

import { useState } from 'react'
import type { AIRecognitionResult } from '@/contracts/ai'
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
import { toast } from 'sonner'

interface RecognitionResultsProps {
  results: AIRecognitionResult[]
  questionIds: string[]
  onEdit?: (result: AIRecognitionResult, index: number) => void
  onDelete?: (index: number) => Promise<void> | void
  onDeleteSelected?: (indices: number[]) => Promise<void> | void
  deleting?: boolean
}

export function RecognitionResults({
  results,
  questionIds,
  onEdit,
  onDelete,
  onDeleteSelected,
  deleting = false,
}: RecognitionResultsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const selectableIds = questionIds.filter(Boolean)
  const selectedCount = selectableIds.filter((id) => selectedIds.has(id)).length
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds))
  }

  const toggleSelected = (questionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const handleDeleteSelected = async () => {
    const indices = questionIds
      .map((questionId, index) => selectedIds.has(questionId) ? index : -1)
      .filter((index) => index >= 0)
    try {
      await onDeleteSelected?.(indices)
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
    } catch {
      // 删除错误由 mutation 统一提示，保留选择方便重试。
    }
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

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#29264a]">
          识别结果 ({results.length} 道题目)
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#625f77]">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#5b55d6]" />
            全选
          </label>
          <Button variant="destructive" size="sm" disabled={selectedCount === 0 || deleting} onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="mr-1 h-4 w-4" />
            删除所选 ({selectedCount})
          </Button>
        </div>
      </div>

      {/* 结果列表 */}
      <div className="space-y-4">
        {results.map((result, index) => {
          const questionId = questionIds[index]
          const subjectLabel = SUBJECTS.find((s) => s.id === result.subject)?.label || result.subject
          const difficultyLabel = DIFFICULTIES.find((d) => d.id === result.difficulty)?.label || result.difficulty
          const difficultyColor = {
            easy: 'bg-green-100 text-green-800 border-green-300',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            hard: 'bg-red-100 text-red-800 border-red-300',
          }[result.difficulty]

          return (
            <div
              key={questionId || index}
              className="space-y-3 rounded-2xl border border-[#e4def5] bg-white shadow-[0_8px_24px_rgba(76,65,147,0.10)] p-4"
            >
              {/* 头部标签 */}
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap gap-2">
                  {questionId && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(questionId)}
                      onChange={() => toggleSelected(questionId)}
                      className="h-4 w-4 accent-[#5b55d6]"
                      aria-label={`选择第 ${index + 1} 道题`}
                    />
                  )}
                  <Badge variant="outline" className="bg-[#f3efff] text-[#514bb8] border-[#c8c1ec]">
                    {subjectLabel}
                  </Badge>
                  <Badge variant="outline" className={difficultyColor}>
                    {difficultyLabel}
                  </Badge>
                  <Badge variant="outline" className="bg-[#f3efff] text-[#514f64] border-[#d7d1eb]">
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
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已自动保存
                  </Badge>
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
                  {onEdit && (
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
                    onClick={() => onDelete?.(index)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="删除"
                    disabled={deleting || !questionId}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 题目内容 */}
              <div>
                <p className="text-sm font-medium text-[#514f64] mb-1">题目：</p>
                <p className="text-[#29264a] whitespace-pre-wrap">{result.content}</p>
              </div>

              {/* 答案 */}
              <div>
                <p className="text-sm font-medium text-[#514f64] mb-1">答案：</p>
                <p className="text-[#29264a] bg-green-50 p-2 rounded">{result.answer}</p>
              </div>

              {/* 解析 */}
              {result.explanation && (
                <div>
                  <p className="text-sm font-medium text-[#514f64] mb-1">解析：</p>
                  <p className="text-[#514f64] bg-[#f3efff] p-2 rounded whitespace-pre-wrap">
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

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
          </DialogHeader>
          <p className="text-[#625f77]">
            确定要删除选中的 {selectedCount} 道题目吗？删除后将同时从错题库移除，且无法撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
