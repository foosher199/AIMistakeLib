'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeleteQuestions, useQuestions } from '@/hooks/useQuestions'
import { QuestionCard } from './QuestionCard'
import { QuestionFilters, type FilterValues } from './QuestionFilters'
import { Button } from '@/components/ui/button'
import type { Question } from '@/types/database'
import { FileText, Loader2, Trash2, X } from 'lucide-react'

interface QuestionListProps {
  onEdit?: (question: Question) => void
  onView?: (question: Question) => void
}

export function QuestionList({ onEdit, onView }: QuestionListProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterValues>({})
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const deleteQuestions = useDeleteQuestions()
  const pageSize = 20

  const { data, isLoading, error } = useQuestions({
    ...filters,
    limit: pageSize,
    offset: page * pageSize,
  })

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters)
    setPage(0) // 重置到第一页
  }

  const hasMore = data ? data.total > (page + 1) * pageSize : false

  const handleSelectionChange = (question: Question, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(question.id)
      else next.delete(question.id)
      return next
    })
  }

  const createWorksheet = () => {
    if (selectedIds.size === 0) return
    router.push(`/dashboard/worksheets/new?ids=${Array.from(selectedIds).join(',')}`)
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0 || !confirm(`确定删除选中的 ${selectedIds.size} 道题目吗？此操作不可撤销。`)) return
    try {
      await deleteQuestions.mutateAsync(Array.from(selectedIds))
      setSelectedIds(new Set())
    } catch {
      // mutation 已显示错误提示。
    }
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <QuestionFilters filters={filters} onChange={handleFilterChange} />

      {selectedIds.size > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cfe7df] bg-[#f1fbf7] p-3 shadow-[0_6px_18px_rgba(16,185,129,0.06)]">
          <span className="text-sm font-medium text-[#2563eb]">
            已选择 {selectedIds.size} 道题
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-full text-[#64748b] hover:bg-white hover:text-[#172b4d]" onClick={() => setSelectedIds(new Set())}>
              <X className="mr-1 h-4 w-4" />清空
            </Button>
            <Button variant="destructive" size="sm" className="rounded-full" onClick={deleteSelected} disabled={deleteQuestions.isPending}>
              <Trash2 className="mr-1 h-4 w-4" />{deleteQuestions.isPending ? '删除中...' : '删除所选'}
            </Button>
            <Button variant="jelly" size="sm" className="rounded-full" onClick={createWorksheet}>
              <FileText className="mr-1 h-4 w-4" />生成练习卷
            </Button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && page === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
          <span className="ml-2 text-[#64748b]">加载中...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="rounded-2xl border border-[#f4c7c7] bg-[#fff7f7] p-4 text-[#c24141]">
          <p className="font-medium">加载失败</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* 题目列表 */}
      {data && (
        <>
          {data.questions.length === 0 ? (
            <div className="rounded-[22px] border border-[#dce8f3] bg-[#f8fbff] p-12 text-center shadow-[0_8px_24px_rgba(58,108,150,0.05)]">
              <p className="text-[#64748b] mb-2">暂无题目</p>
              <p className="text-sm text-[#64748b]">
                {Object.keys(filters).length > 0
                  ? '没有符合筛选条件的题目，试试调整筛选条件'
                  : '开始上传错题吧！'}
              </p>
            </div>
          ) : (
            <>
              {/* 结果计数 */}
              <div className="text-sm font-medium text-[#64748b]">
                共找到 <span className="font-medium text-[#172b4d]">{data.total}</span> 道题目
                {page > 0 && (
                  <span className="ml-2">
                    （显示 {Math.min((page + 1) * pageSize, data.total)} / {data.total}）
                  </span>
                )}
              </div>

              {/* 题目卡片列表 */}
              <div className="grid grid-cols-1 gap-4">
                {data.questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onEdit={onEdit}
                    onView={onView}
                    selected={selectedIds.has(question.id)}
                    onSelectionChange={handleSelectionChange}
                  />
                ))}
              </div>

              {(page > 0 || hasMore) && (
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || isLoading}>上一页</Button>
                  <span className="text-sm text-[#64748b]">第 {page + 1} 页</span>
                  <Button variant="outline" onClick={() => setPage((value) => value + 1)} disabled={!hasMore || isLoading}>下一页</Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
