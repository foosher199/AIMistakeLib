'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useQuestions } from '@/hooks/useQuestions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Mail,
  Key,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  BookOpen,
  TrendingUp,
  Loader2,
  LogOut,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, isAnonymous, signOut } = useAuth()
  const { data, isLoading } = useQuestions({ limit: 1000 })

  const handleSignOut = async () => {
    const { error } = await signOut()

    if (error) {
      toast.error('退出登录失败：' + error.message)
      return
    }

    // 退出成功后跳转到首页
    toast.success('已退出登录')
    router.push('/')
  }

  // 从查询结果中提取 questions 数组
  const questions = data?.questions || []

  // 计算统计数据
  const stats = useMemo(() => {
    const total = questions.length
    const mastered = questions.filter((q) => q.is_mastered).length
    const reviewing = questions.filter(
      (q) => !q.is_mastered && q.review_count > 0
    ).length
    const notStarted = questions.filter((q) => q.review_count === 0).length
    const totalReviews = questions.reduce((sum, q) => sum + q.review_count, 0)

    // 按学科统计
    const bySubject = questions.reduce(
      (acc, q) => {
        acc[q.subject] = (acc[q.subject] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total,
      mastered,
      reviewing,
      notStarted,
      totalReviews,
      bySubject,
    }
  }, [questions])

  // 检查登录状态
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // 加载中或未登录时显示加载状态
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3b82f6] animate-spin mx-auto mb-4" />
          <p className="text-[#64748b]">加载中...</p>
        </div>
      </div>
    )
  }

  // 学科中文名称映射
  const subjectNames: Record<string, string> = {
    math: '数学',
    chinese: '语文',
    english: '英语',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    history: '历史',
    geography: '地理',
    politics: '政治',
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#172b4d] mb-2">个人中心</h1>
        <p className="text-[#64748b]">管理您的账户信息和数据</p>
      </div>

      {/* 数据加载中 */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-[#dce7f5] shadow-[0_8px_24px_rgba(30,64,100,0.07)] p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin mb-3" />
            <p className="text-[#64748b]">正在加载数据...</p>
          </div>
        </div>
      )}

      {/* 主要内容 - 只在非加载状态下显示 */}
      {!isLoading && (
        <>
          {/* 账户信息卡片 */}
          <div className="rounded-[22px] border border-[#dce8f3] bg-white p-6 shadow-[0_10px_28px_rgba(58,108,150,0.06)]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#172b4d] mb-1">
                  账户信息
                </h2>
                <p className="text-sm text-[#64748b]">
                  {isAnonymous ? '您正在使用游客模式' : '您的账户信息'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAnonymous ? (
                  <Badge variant="secondary" className="bg-yellow-100 text-[#92400e]">
                    游客账户
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    正式账户
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 text-[#dc2626] hover:bg-[#fff1f2] hover:text-[#b91c1c]"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">退出登录</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* 用户 ID */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#dbeafe] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#64748b]">用户 ID</p>
                  <p className="text-sm font-mono text-[#172b4d]">
                    {user?.id?.slice(0, 8) || 'N/A'}...
                  </p>
                </div>
              </div>

              {/* 邮箱 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ecfdf5] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#10b981]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#64748b]">邮箱地址</p>
                  <p className="text-sm font-medium text-[#172b4d]">
                    {user?.email || '未绑定'}
                  </p>
                </div>
                {isAnonymous && (
                  <Link href="/dashboard/bind-email">
                    <Button size="sm" variant="outline">
                      立即绑定
                    </Button>
                  </Link>
                )}
              </div>

              {/* 创建时间 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#64748b]">注册时间</p>
                  <p className="text-sm font-medium text-[#172b4d]">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('zh-CN')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* 游客提示 */}
            {isAnonymous && (
              <div className="mt-6 p-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb]">
                <p className="text-sm text-[#92400e]">
                  <strong>提示：</strong>
                  游客账户的数据可能在浏览器清除后丢失。建议绑定邮箱以永久保存您的数据。
                </p>
              </div>
            )}
          </div>

          {/* 数据统计卡片 */}
          <div className="rounded-[22px] border border-[#dce8f3] bg-white p-6 shadow-[0_10px_28px_rgba(58,108,150,0.06)]">
            <h2 className="text-xl font-semibold text-[#172b4d] mb-6">数据统计</h2>

            {/* 总览统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-[#eff6ff]">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-[#3b82f6]" />
                  <p className="text-sm text-[#3b82f6] font-medium">总题目数</p>
                </div>
                <p className="text-2xl font-bold text-[#1e40af]">{stats.total}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#ecfdf5]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-[#10b981]" />
                  <p className="text-sm text-[#10b981] font-medium">已掌握</p>
                </div>
                <p className="text-2xl font-bold text-[#047857]">{stats.mastered}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fffbeb]">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#d97706]" />
                  <p className="text-sm text-[#d97706] font-medium">复习中</p>
                </div>
                <p className="text-2xl font-bold text-[#92400e]">
                  {stats.reviewing}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f7fafc]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#64748b]" />
                  <p className="text-sm text-[#64748b] font-medium">未开始</p>
                </div>
                <p className="text-2xl font-bold text-[#172b4d]">
                  {stats.notStarted}
                </p>
              </div>
            </div>

            {/* 学科分布 */}
            {Object.keys(stats.bySubject).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#172b4d] mb-3">
                  学科分布
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(stats.bySubject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([subject, count]) => (
                      <div
                        key={subject}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#f7fafc]"
                      >
                        <span className="text-sm text-[#475569]">
                          {subjectNames[subject] || subject}
                        </span>
                        <span className="text-sm font-semibold text-[#172b4d]">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 复习统计 */}
            {stats.totalReviews > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-[#eff6ff]">
                <p className="text-sm text-[#2563eb]">
                  累计复习次数：
                  <span className="font-semibold ml-1">{stats.totalReviews}</span> 次
                </p>
              </div>
            )}

            {/* 空状态 */}
            {stats.total === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-[#94a3b8] mx-auto mb-3" />
                <p className="text-[#64748b] mb-4">还没有错题数据</p>
                <Link href="/dashboard/upload">
                  <Button>立即上传错题</Button>
                </Link>
              </div>
            )}
          </div>

          {/* 账户操作卡片 */}
          <div className="rounded-[22px] border border-[#dce8f3] bg-white p-6 shadow-[0_10px_28px_rgba(58,108,150,0.06)]">
            <h2 className="text-xl font-semibold text-[#172b4d] mb-4">账户操作</h2>

            <div className="space-y-3">
              {/* 绑定邮箱（仅游客） */}
              {isAnonymous && (
                <Link href="/dashboard/bind-email">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Mail className="w-4 h-4" />
                    绑定邮箱
                  </Button>
                </Link>
              )}

              {/* 意见反馈 */}
              <Link href="/dashboard/feedback">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MessageSquare className="w-4 h-4" />
                  意见反馈
                </Button>
              </Link>

              {/* 修改密码（仅正式用户） */}
              {!isAnonymous && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Key className="w-4 h-4" />
                  修改密码（即将上线）
                </Button>
              )}

              {/* 导出数据 */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                disabled
              >
                <Download className="w-4 h-4" />
                导出数据（即将上线）
              </Button>

              {/* 删除账户 */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-[#dc2626] hover:bg-[#fff1f2] hover:text-[#b91c1c]"
                disabled
              >
                <Trash2 className="w-4 h-4" />
                删除账户（即将上线）
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
