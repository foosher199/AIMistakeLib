'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useQuestions } from '@/hooks/useQuestions'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SubjectIcon } from '@/components/subjects/SubjectIcon'
import { SUBJECT_CONFIG } from '@/lib/subject-config'
import {
  Search,
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  ChevronRight,
  Calendar,
  GraduationCap,
  Loader2,
} from 'lucide-react'
import { SUBJECTS, CATEGORIES, type Subject, type Difficulty } from '@/types/database'
import Link from 'next/link'

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')

  // 检查登录状态
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // 获取所有题目
  const { data: questionsData, isLoading: questionsLoading } = useQuestions({
    limit: 1000,
  })
  const questions = useMemo(
    () => questionsData?.questions ?? [],
    [questionsData?.questions]
  )

  // 计算详细统计
  const stats = useMemo(() => {
    const total = questions.length
    const mastered = questions.filter((q) => q.is_mastered).length
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0

    // 按学科统计
    const bySubject = SUBJECTS.map((subject) => {
      const subjectQuestions = questions.filter((q) => q.subject === subject.id)
      const subjectMastered = subjectQuestions.filter((q) => q.is_mastered).length
      const config = SUBJECT_CONFIG[subject.id]
      return {
        ...subject,
        ...config,
        total: subjectQuestions.length,
        mastered: subjectMastered,
        rate:
          subjectQuestions.length > 0
            ? Math.round((subjectMastered / subjectQuestions.length) * 100)
            : 0,
      }
    }).filter((s) => s.total > 0)

    // 按难度统计
    const byDifficulty = {
      easy: {
        total: questions.filter((q) => q.difficulty === 'easy').length,
        mastered: questions.filter((q) => q.difficulty === 'easy' && q.is_mastered)
          .length,
      },
      medium: {
        total: questions.filter((q) => q.difficulty === 'medium').length,
        mastered: questions.filter(
          (q) => q.difficulty === 'medium' && q.is_mastered
        ).length,
      },
      hard: {
        total: questions.filter((q) => q.difficulty === 'hard').length,
        mastered: questions.filter((q) => q.difficulty === 'hard' && q.is_mastered)
          .length,
      },
    }

    // 本周新增
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weeklyNew = questions.filter((q) => {
      const createdAt = new Date(q.created_at)
      return createdAt > weekAgo
    }).length

    return {
      total,
      mastered,
      pending: total - mastered,
      masteryRate,
      bySubject,
      byDifficulty,
      weeklyNew,
    }
  }, [questions])

  // 筛选题目
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchContent = q.content.toLowerCase().includes(query)
        const matchCategory = q.category.toLowerCase().includes(query)
        if (!matchContent && !matchCategory) return false
      }
      if (selectedSubject && q.subject !== selectedSubject) return false
      if (selectedCategory && q.category !== selectedCategory) return false
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false
      return true
    })
  }, [questions, searchQuery, selectedSubject, selectedCategory, selectedDifficulty])

  // 最近添加的题目
  const recentQuestions = useMemo(() => {
    return [...questions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [questions])

  const getDifficultyColor = (d: Difficulty) => {
    switch (d) {
      case 'easy':
        return 'bg-[#ecfdf5] text-[#0f766e]'
      case 'medium':
        return 'bg-[#fef3c7] text-[#f59e0b]'
      case 'hard':
        return 'bg-[#ffe4e6] text-[#f43f5e]'
      default:
        return 'bg-[#f1f5f9] text-[#64748b]'
    }
  }

  const getDifficultyLabel = (d: Difficulty) => {
    switch (d) {
      case 'easy':
        return '简单'
      case 'medium':
        return '中等'
      case 'hard':
        return '困难'
      default:
        return d
    }
  }

  // 加载中或未登录时显示加载状态
  if (loading || !user || questionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mx-auto mb-4" />
          <p className="text-[#64748b]">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#172033] mb-2">历史题库</h1>
        <p className="text-[#64748b]">查看学习进度和错题统计</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce5ef]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#eff6ff] rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#2563eb]" />
            </div>
            <span className="text-sm text-[#64748b]">总错题数</span>
          </div>
          <p className="text-3xl font-bold text-[#172033]">{stats.total}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce5ef]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-[#64748b]">掌握率</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.masteryRate}%</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce5ef]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-[#64748b]">待复习</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dce5ef]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#eff6ff] rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#2563eb]" />
            </div>
            <span className="text-sm text-[#64748b]">本周新增</span>
          </div>
          <p className="text-3xl font-bold text-[#2563eb]">{stats.weeklyNew}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Subject Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#dce5ef] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#2563eb]" />
              <h3 className="font-bold text-[#172033]">学科分布</h3>
            </div>
            {stats.bySubject.length === 0 ? (
              <p className="text-center text-[#64748b] py-4">暂无数据</p>
            ) : (
              <div className="space-y-4">
                {stats.bySubject.map((subject) => (
                  <div key={subject.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <SubjectIcon
                          subject={subject.id}
                          className="h-4 w-4"
                          style={{ color: subject.color }}
                        />
                        <span className="text-sm font-medium text-[#172033]">
                          {subject.name}
                        </span>
                      </div>
                      <span className="text-sm text-[#64748b]">
                        {subject.mastered}/{subject.total}
                      </span>
                    </div>
                    <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${subject.rate}%`,
                          backgroundColor: subject.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-[#64748b] mt-1">掌握率 {subject.rate}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#dce5ef] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#2563eb]" />
              <h3 className="font-bold text-[#172033]">难度分布</h3>
            </div>
            <div className="space-y-3">
              {[
                { key: 'easy', label: '简单', color: '#0f766e' },
                { key: 'medium', label: '中等', color: '#f59e0b' },
                { key: 'hard', label: '困难', color: '#f43f5e' },
              ].map((diff) => {
                const data =
                  stats.byDifficulty[diff.key as keyof typeof stats.byDifficulty]
                const rate =
                  data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0
                return (
                  <div key={diff.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: diff.color }}
                      />
                      <span className="text-sm text-[#64748b]">{diff.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#172033] font-medium">
                        {data.mastered}/{data.total}
                      </span>
                      <span className="text-xs text-[#64748b] w-10 text-right">
                        {rate}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#dce5ef] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#2563eb]" />
              <h3 className="font-bold text-[#172033]">最近添加</h3>
            </div>
            {recentQuestions.length === 0 ? (
              <p className="text-center text-[#64748b] py-4">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {recentQuestions.map((q) => {
                  const subject = SUBJECT_CONFIG[q.subject as Subject]
                  return (
                    <Link
                      key={q.id}
                      href={`/dashboard/questions?id=${q.id}`}
                      className="block p-3 bg-[#f6f9fc] rounded-xl hover:bg-[#eff6ff]/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <SubjectIcon
                          subject={q.subject as Subject}
                          className="h-4 w-4"
                          style={{ color: subject?.color }}
                        />
                        <span className="text-xs text-[#64748b]">
                          {new Date(q.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-[#172033] line-clamp-1">{q.content}</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Question List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-[#dce5ef] p-5">
            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                  <Input
                    placeholder="搜索题目内容..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 border-[#dce5ef] focus:border-[#2563eb] rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value)
                    setSelectedCategory('')
                  }}
                  className="px-4 py-2 bg-[#f6f9fc] border border-[#dce5ef] rounded-2xl text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="">所有学科</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-[#f6f9fc] border border-[#dce5ef] rounded-2xl text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="">所有分类</option>
                  {(selectedSubject
                    ? CATEGORIES[selectedSubject as Subject] || []
                    : []
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-4 py-2 bg-[#f6f9fc] border border-[#dce5ef] rounded-2xl text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="">所有难度</option>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
                {(selectedSubject || selectedCategory || selectedDifficulty) && (
                  <button
                    onClick={() => {
                      setSelectedSubject('')
                      setSelectedCategory('')
                      setSelectedDifficulty('')
                    }}
                    className="px-4 py-2 text-sm text-[#f43f5e] hover:bg-[#ffe4e6] rounded-2xl transition-colors"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#64748b]">
                共{' '}
                <span className="font-bold text-[#172033]">
                  {filteredQuestions.length}
                </span>{' '}
                道错题
              </p>
            </div>

            {/* Question List */}
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#f1f5f9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-[#94a3b8]" />
                </div>
                <p className="text-[#64748b]">没有找到符合条件的错题</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((question) => {
                  const subject = SUBJECT_CONFIG[question.subject as Subject]
                  return (
                    <Link
                      key={question.id}
                      href={`/dashboard/questions?id=${question.id}`}
                      className="block p-4 bg-[#f6f9fc] rounded-xl hover:bg-[#eff6ff]/20 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: subject?.color + '20' }}
                        >
                          <SubjectIcon
                            subject={question.subject as Subject}
                            className="h-6 w-6"
                            style={{ color: subject?.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className="gap-1.5 border-[#dce5ef] bg-white text-xs font-semibold text-[#172033] shadow-none"
                            >
                              <SubjectIcon
                                subject={question.subject as Subject}
                                className="h-3.5 w-3.5"
                                style={{ color: subject?.color }}
                              />
                              {subject?.name}
                            </Badge>
                            <Badge
                              className={`text-xs ${getDifficultyColor(
                                question.difficulty
                              )}`}
                            >
                              {getDifficultyLabel(question.difficulty)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-white text-[#64748b]"
                            >
                              {question.category}
                            </Badge>
                            {question.is_mastered && (
                              <Badge className="text-xs bg-green-100 text-green-600">
                                已掌握
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#172033] font-medium line-clamp-2 mb-2">
                            {question.content}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-[#64748b]">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-4 h-4" />
                              答案：{question.answer}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(question.created_at).toLocaleDateString(
                                'zh-CN'
                              )}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#dce5ef] group-hover:text-[#2563eb] transition-colors" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
