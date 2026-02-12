'use client'

import { useState } from 'react'
import { useQuestions } from '@/hooks/useQuestions'
import { QuestionCard } from './QuestionCard'
import { QuestionFilters, type FilterValues } from './QuestionFilters'
import { Button } from '@/components/ui/button'
import type { Question } from '@/types/database'
import { Loader2 } from 'lucide-react'

interface QuestionListProps {
  onEdit?: (question: Question) => void
  onView?: (question: Question) => void
}

export function QuestionList({ onEdit, onView }: QuestionListProps) {
  const [filters, setFilters] = useState<FilterValues>({})
  const [page, setPage] = useState(0)
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

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  const hasMore = data ? data.total > (page + 1) * pageSize : false

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <QuestionFilters filters={filters} onChange={handleFilterChange} />

      {/* 加载状态 */}
      {isLoading && page === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0070a0] animate-spin" />
          <span className="ml-2 text-[#626a72]">加载中...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="bg-[#ffe4e6] border border-[#f43f5e]/20 rounded-lg p-4 text-[#f43f5e]">
          <p className="font-medium">加载失败</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* 题目列表 */}
      {data && (
        <>
          {data.questions.length === 0 ? (
            <div className="bg-[#f7f9fa] border border-[#dee5eb] rounded-lg p-12 text-center">
              <p className="text-[#626a72] mb-2">暂无题目</p>
              <p className="text-sm text-[#626a72]">
                {Object.keys(filters).length > 0
                  ? '没有符合筛选条件的题目，试试调整筛选条件'
                  : '开始上传错题吧！'}
              </p>
            </div>
          ) : (
            <>
              {/* 结果计数 */}
              <div className="text-sm text-[#626a72]">
                共找到 <span className="font-medium text-[#1f1f1f]">{data.total}</span> 道题目
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
                  />
                ))}
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      '加载更多'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
