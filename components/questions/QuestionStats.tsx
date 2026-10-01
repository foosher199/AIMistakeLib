'use client'

import { useQuestionStats } from '@/hooks/useQuestions'
import { BookOpen, CheckCircle, Clock } from 'lucide-react'

export function QuestionStats() {
  const { data: stats, isLoading, error } = useQuestionStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[#dce5ef] shadow-[0_8px_24px_rgba(30,64,100,0.10)] p-6 animate-pulse"
          >
            <div className="h-4 bg-[#f6f9fc] rounded w-20 mb-2" />
            <div className="h-8 bg-[#f6f9fc] rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#ffe4e6] border border-[#f43f5e]/20 rounded-2xl p-4 text-[#f43f5e] text-sm">
        加载统计信息失败
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const masteryRate = stats.total > 0 ? ((stats.mastered / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 总题数 */}
      <div className="bg-white rounded-2xl border border-[#dce5ef] shadow-[0_8px_24px_rgba(30,64,100,0.10)] p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#64748b] mb-1">总题数</p>
            <p className="text-3xl font-bold text-[#172033]">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-[#eff6ff] rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#2563eb]" />
          </div>
        </div>
      </div>

      {/* 已掌握 */}
      <div className="bg-white rounded-2xl border border-[#dce5ef] shadow-[0_8px_24px_rgba(30,64,100,0.10)] p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#64748b] mb-1">已掌握</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#0f766e]">{stats.mastered}</p>
              <p className="text-sm text-[#64748b]">({masteryRate}%)</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-[#ecfdf5] rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#0f766e]" />
          </div>
        </div>
      </div>

      {/* 待复习 */}
      <div className="bg-white rounded-2xl border border-[#dce5ef] shadow-[0_8px_24px_rgba(30,64,100,0.10)] p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#64748b] mb-1">待复习</p>
            <p className="text-3xl font-bold text-[#f59e0b]">{stats.pending}</p>
          </div>
          <div className="w-12 h-12 bg-[#fef3c7] rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-[#f59e0b]" />
          </div>
        </div>
      </div>
    </div>
  )
}
