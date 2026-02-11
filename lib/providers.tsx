'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * React Query Provider
 * 配置全局查询客户端
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 数据保持新鲜的时间（5分钟）
            staleTime: 1000 * 60 * 5,
            // 失败重试次数
            retry: 1,
            // 失败重试延迟
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // 窗口重新获得焦点时重新获取数据
            refetchOnWindowFocus: false,
          },
          mutations: {
            // mutation 失败重试次数
            retry: 0,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
