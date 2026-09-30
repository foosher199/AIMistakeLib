'use client'

import { usePathname } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/dashboard')) {
    return <DashboardShell>{children}</DashboardShell>
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fff9f1]">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
