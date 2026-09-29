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
    <nav className="bg-white border-b border-[#dee5eb] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? '/dashboard/upload' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0070a0] rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1f1f1f]">AI 错题本</span>
          </Link>

          {/* 登录后从首页快速进入工作台 */}
          {user && (
            <Link href="/dashboard/upload" className="hidden md:block">
              <Button variant="ghost" className="gap-2 text-[#626a72] hover:text-[#0070a0]">
                <LayoutDashboard className="h-4 w-4" />
                进入工作台
              </Button>
            </Link>
          )}

          {/* 用户按钮或登录按钮 */}
          {user ? (
            <div className="flex items-center gap-1">
              <Link href="/dashboard/credits">
                <Button variant="ghost" className="gap-2 text-[#0070a0]">
                  <Coins className="w-4 h-4" />
                  <span>{credits?.availablePoints ?? 0}</span>
                  <span className="hidden lg:inline">积分</span>
                </Button>
              </Link>
              <Link href="/dashboard/profile">
                <Button variant="ghost" className="gap-2">
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
              className="gap-2 bg-[#0070a0] hover:bg-[#005580] text-white"
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
