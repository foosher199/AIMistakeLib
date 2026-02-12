'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // 如果未登录，重定向到首页
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0070a0] animate-spin mx-auto" />
          <p className="mt-4 text-[#626a72]">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录状态
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}
