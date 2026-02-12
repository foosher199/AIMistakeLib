import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/lib/providers'
import { Toaster } from 'sonner'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI 错题本 - 智能识别，科学复习',
  description: '使用 AI 技术自动识别和管理错题，让学习更高效',
  keywords: ['错题本', 'AI识别', '学习工具', '教育', '复习'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-[#f7f9fa] flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  )
}

