'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { Button } from '@/components/ui/button'
import { BookOpen, User, Camera, History, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()
  const { user, isAnonymous } = useAuth()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)

  const navItems = [
    { href: '/', label: '首页', icon: BookOpen },
    { href: '/dashboard/upload', label: '拍照识题', icon: Camera },
    { href: '/dashboard/questions', label: '我的错题', icon: BookOpen },
    { href: '/dashboard/history', label: '历史题库', icon: History },
  ]

  return (
    <nav className="bg-white border-b border-[#dee5eb] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0070a0] rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1f1f1f]">AI 错题本</span>
          </Link>

          {/* 导航链接 - 仅登录用户可见 */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'gap-2 text-[#626a72] hover:text-[#0070a0] hover:bg-[#f7f9fa]',
                        isActive && 'bg-[#cce5f3] text-[#0070a0]'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}

          {/* 用户按钮或登录按钮 */}
          {user ? (
            <Link href="/dashboard/profile">
              <Button variant="ghost" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isAnonymous ? '游客' : user?.email || '用户'}
                </span>
              </Button>
            </Link>
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

        {/* 移动端导航 - 仅登录用户可见 */}
        {user && (
          <div className="md:hidden border-t border-gray-200">
            <div className="flex items-center justify-around py-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'flex-col h-auto py-2 gap-1 text-[#626a72] hover:text-[#0070a0] hover:bg-[#f7f9fa]',
                        isActive && 'bg-[#cce5f3] text-[#0070a0]'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 登录弹窗 */}
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
      />
    </nav>
  )
}
