'use client'

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 移除强制登录检查，允许未登录用户访问
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
