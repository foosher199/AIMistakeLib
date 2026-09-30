'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Camera,
  Coins,
  FileText,
  History,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const navigation = [
  { href: '/dashboard/upload', label: '拍照识题', icon: Camera },
  { href: '/dashboard/questions', label: '我的错题', icon: BookOpen },
  { href: '/dashboard/worksheets', label: '错题过关', icon: FileText },
  { href: '/dashboard/history', label: '历史题库', icon: History },
  { href: '/dashboard/stats', label: '数据统计', icon: BarChart3 },
]

const secondaryNavigation = [
  { href: '/dashboard/credits', label: '积分中心', icon: Coins },
  { href: '/dashboard/feedback', label: '意见反馈', icon: MessageSquare },
]

const pageTitles: Record<string, string> = {
  '/dashboard/upload': '拍照识题',
  '/dashboard/questions': '我的错题',
  '/dashboard/worksheets': '错题过关',
  '/dashboard/history': '历史题库',
  '/dashboard/stats': '数据统计',
  '/dashboard/credits': '积分中心',
  '/dashboard/profile': '个人中心',
  '/dashboard/bind-email': '注册正式账户',
  '/dashboard/feedback': '意见反馈',
  '/dashboard/admin/invites': '邀请码管理',
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  const renderLink = ({ href, label, icon: Icon }: (typeof navigation)[number]) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      className={cn(
        'dashboard-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
        isCurrentPath(pathname, href) && 'is-active'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  )

  return (
    <>
      <Link
        href="/dashboard/upload"
        onClick={onNavigate}
        className="flex h-16 items-center gap-3 border-b border-white/10 px-5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-gradient-to-br from-[#756ff0] to-[#5b55d6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_5px_12px_rgba(91,85,214,0.24)]">
          <BookOpen className="h-5 w-5 text-white" />
        </span>
        <span className="text-lg font-bold text-white">AI 错题本</span>
      </Link>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-5" aria-label="工作区导航">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
          学习工具
        </p>
        <div className="space-y-1">{navigation.map(renderLink)}</div>

        <div className="my-5 border-t border-white/10" />
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/45">
          账户与支持
        </p>
        <div className="space-y-1">{secondaryNavigation.map(renderLink)}</div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          className={cn(
            'dashboard-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
            isCurrentPath(pathname, '/dashboard/profile') && 'is-active'
          )}
        >
          <User className="h-5 w-5" />
          个人中心
        </Link>
      </div>
    </>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, isAnonymous, signOut } = useAuth()
  const { data: credits } = useCredits(Boolean(user))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    if (mobileMenuOpen) window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [loading, router, user])

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      toast.error(`退出登录失败：${error.message}`)
      return
    }
    toast.success('已退出登录')
    router.push('/')
  }

  const pageTitle =
    Object.entries(pageTitles).find(([href]) => isCurrentPath(pathname, href))?.[1] ??
    '学习工作台'
  const displayName = isAnonymous ? '游客' : user?.email || '用户'

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff9f1]">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#5b55d6]" />
          <p className="mt-3 text-sm text-[#625f77]">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#fff9f1]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_5%,rgba(91,85,214,0.13),transparent_30%),radial-gradient(circle_at_70%_95%,rgba(53,169,145,0.12),transparent_32%)]" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden border-r border-[#4b46b8] bg-gradient-to-b from-[#5b55d6] via-[#514bb8] to-[#403a9f] shadow-[10px_0_30px_rgba(64,58,159,0.12)] xl:flex">
        <div className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-[#35a991]/20 blur-3xl" />
        <SidebarContent pathname={pathname} />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="关闭菜单"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="导航菜单"
            className="relative flex h-full w-[min(18rem,85vw)] flex-col overflow-hidden bg-gradient-to-b from-[#5b55d6] via-[#514bb8] to-[#403a9f] shadow-2xl"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="关闭菜单"
              className="absolute right-2 top-2 z-10 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarContent pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="xl:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#ded9fb] bg-gradient-to-r from-[#f1edff]/95 via-[#fffdf9]/95 to-[#eaf9f5]/95 px-4 shadow-[0_4px_18px_rgba(76,65,147,0.10)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="打开菜单"
              className="shrink-0 xl:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#35a991] shadow-[0_0_0_4px_rgba(53,169,145,0.14)]" />
            <p className="truncate text-lg font-bold text-[#29264a]">{pageTitle}</p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/dashboard/credits">
              <Button variant="ghost" className="gap-2 text-[#5b55d6]">
                <Coins className="h-4 w-4" />
                <span>{credits?.availablePoints ?? 0}</span>
                <span className="hidden sm:inline">积分</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="max-w-[12rem] gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eeeafd] text-[#5b55d6]">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="hidden truncate text-sm sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-[#625f77]">
                  {displayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer gap-2">
                    <User className="h-4 w-4" />
                    个人中心
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-red-600 focus:text-red-700"
                  onSelect={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
