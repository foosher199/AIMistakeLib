'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useQuestions } from '@/hooks/useQuestions'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/stats/StatCard'
import { DistributionBar } from '@/components/stats/DistributionBar'
import { MasteryBySubject } from '@/components/stats/MasteryBySubject'
import { MistakeReasonChart } from '@/components/stats/MistakeReasonChart'
import { TimelineChart } from '@/components/stats/TimelineChart'
import { SUBJECTS, DIFFICULTIES, MISTAKE_REASONS } from '@/types/database'
import {
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  Upload,
  Loader2,
} from 'lucide-react'

const difficultyColors: Record<string, string> = {
  easy: '#0f766e',
  medium: '#f59e0b',
  hard: '#f43f5e',
}

export default function StatsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    limit: 1000,
  })
  const questions = questionsData?.questions || []

  const stats = useMemo(() => {
    const total = questions.length
    const mastered = questions.filter((q) => q.is_mastered).length
    const pending = total - mastered
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0
    const totalReviews = questions.reduce((sum, q) => sum + q.review_count, 0)

    const bySubject = SUBJECTS.map((subject) => {
      const subjectQuestions = questions.filter((q) => q.subject === subject.id)
      const subjectMastered = subjectQuestions.filter((q) => q.is_mastered).length
      return {
        id: subject.id,
        name: subject.label,
        total: subjectQuestions.length,
        mastered: subjectMastered,
        rate:
          subjectQuestions.length > 0
            ? Math.round((subjectMastered / subjectQuestions.length) * 100)
            : 0,
      }
    }).filter((s) => s.total > 0)

    const byDifficulty = DIFFICULTIES.map((diff) => ({
      id: diff.id,
      label: diff.label,
      count: questions.filter((q) => q.difficulty === diff.id).length,
      color: difficultyColors[diff.id],
    }))

    const reasonCounts = new Map<string, number>()
    questions.forEach((q) => {
      q.mistake_reason?.forEach((reason) => {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
      })
    })

    const byMistakeReason = MISTAKE_REASONS.map((reason) => ({
      reason: reason.id,
      count: reasonCounts.get(reason.id) || 0,
      percentage:
        total > 0
          ? Math.round(((reasonCounts.get(reason.id) || 0) / total) * 100)
          : 0,
    }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const timeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (29 - i))
      const dateStr = date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      })
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const count = questions.filter((q) => {
        const created = new Date(q.created_at)
        return created >= date && created < nextDate
      }).length
      return { date: dateStr, count }
    })

    return {
      total,
      mastered,
      pending,
      masteryRate,
      totalReviews,
      bySubject,
      byDifficulty,
      byMistakeReason,
      timeline,
      maxTimelineCount: Math.max(...timeline.map((d) => d.count), 1),
    }
  }, [questions])

  if (loading || questionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin mr-2" />
        <span className="text-[#64748b]">加载中...</span>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (stats.total === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172b4d] mb-2">数据统计</h1>
          <p className="text-[#64748b]">洞察错题分布，聚焦薄弱环节</p>
        </div>

        <div className="rounded-[22px] border border-[#dce8f3] bg-white p-8 shadow-[0_10px_28px_rgba(58,108,150,0.06)] text-center">
          <div className="w-16 h-16 bg-[#eaf3ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-[#3b82f6]" />
          </div>
          <h2 className="text-xl font-semibold text-[#172b4d] mb-2">暂无数据</h2>
          <p className="text-[#64748b] mb-6">还没有错题记录，快去拍照识别题目吧</p>
          <Link href="/dashboard/upload">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              去拍照识题
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-bold text-[#172b4d] mb-2">数据统计</h1>
        <p className="text-[#64748b]">洞察错题分布，聚焦薄弱环节</p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="总错题数"
          value={stats.total}
          icon={BookOpen}
          colorClass="bg-[#eff6ff] text-[#3b82f6]"
        />
        <StatCard
          label="已掌握"
          value={stats.mastered}
          icon={Target}
          colorClass="bg-[#ecfdf5] text-[#0f766e]"
        />
        <StatCard
          label="待复习"
          value={stats.pending}
          icon={Clock}
          colorClass="bg-[#fffbeb] text-[#f59e0b]"
        />
        <StatCard
          label="掌握率"
          value={`${stats.masteryRate}%`}
          icon={TrendingUp}
          colorClass="bg-[#dbeafe] text-[#3b82f6]"
        />
        <StatCard
          label="总复习次数"
          value={stats.totalReviews}
          icon={BarChart3}
          colorClass="bg-[#f1edff] text-[#7c5ac7]"
        />
      </div>

      {/* 学科掌握 + 难度分布 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-[22px] border border-[#dce8f3] bg-white p-5 shadow-[0_10px_28px_rgba(58,108,150,0.06)]">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#3b82f6]" />
            <h2 className="text-lg font-semibold text-[#172b4d]">学科掌握情况</h2>
          </div>
          <MasteryBySubject subjects={stats.bySubject} />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce7f5]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#3b82f6]" />
            <h2 className="text-lg font-semibold text-[#172b4d]">难度分布</h2>
          </div>
          {stats.byDifficulty.map((diff) => (
            <DistributionBar
              key={diff.id}
              label={diff.label}
              count={diff.count}
              total={stats.total}
              color={diff.color}
            />
          ))}
        </div>
      </div>

      {/* AI 错因分布 + 30 天趋势 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce7f5]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#3b82f6]" />
            <h2 className="text-lg font-semibold text-[#172b4d]">AI 错因分析</h2>
          </div>
          <MistakeReasonChart reasons={stats.byMistakeReason} />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce7f5]">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#3b82f6]" />
            <h2 className="text-lg font-semibold text-[#172b4d]">近 30 天新增错题</h2>
          </div>
          <TimelineChart data={stats.timeline} maxCount={stats.maxTimelineCount} />
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#64748b]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#eff6ff]" />
              <span>更早</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-[#3b82f6]" />
              <span>近 7 天</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
