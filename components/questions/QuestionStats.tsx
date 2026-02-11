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
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
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
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">总题数</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* 已掌握 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">已掌握</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600">{stats.mastered}</p>
              <p className="text-sm text-gray-500">({masteryRate}%)</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* 待复习 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">待复习</p>
            <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
