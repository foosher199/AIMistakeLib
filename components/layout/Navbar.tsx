'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { Button } from '@/components/ui/button'
import { BookOpen, User, LogIn, Coins, LayoutDashboard } from 'lucide-react'

export function Navbar() {
  const router = useRouter()
  const { user, isAnonymous } = useAuth()
  const { data: credits } = useCredits(Boolean(user))
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-[#e8e2fa] bg-[#fffdf9]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? '/dashboard/upload' : '/'} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-gradient-to-br from-[#756ff0] to-[#5b55d6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_3px_0_#403a9f]">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#29264a]">AI 错题本</span>
          </Link>

          {/* 登录后从首页快速进入工作台 */}
          {user && (
            <Link href="/dashboard/upload" className="hidden md:block">
              <Button variant="ghost" className="gap-2 rounded-xl text-[#625f77] hover:bg-[#eeeafd] hover:text-[#5b55d6]">
                <LayoutDashboard className="h-4 w-4" />
                进入工作台
              </Button>
            </Link>
          )}

          {/* 用户按钮或登录按钮 */}
          {user ? (
            <div className="flex items-center gap-1">
              <Link href="/dashboard/credits">
                <Button variant="ghost" className="gap-2 rounded-xl text-[#5b55d6] hover:bg-[#eeeafd]">
                  <Coins className="w-4 h-4" />
                  <span>{credits?.availablePoints ?? 0}</span>
                  <span className="hidden lg:inline">积分</span>
                </Button>
              </Link>
              <Link href="/dashboard/profile">
                <Button variant="ghost" className="gap-2 rounded-xl hover:bg-[#eeeafd]">
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">
                    {isAnonymous ? '游客' : user?.email || '用户'}
                  </span>
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              onClick={() => setLoginDialogOpen(true)}
              variant="jelly"
              className="h-10 gap-2 rounded-xl px-4"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">登录</span>
            </Button>
          )}
        </div>

      </div>

      {/* 登录弹窗 */}
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onLoginSuccess={() => router.push('/dashboard/credits')}
      />
    </nav>
  )
}
