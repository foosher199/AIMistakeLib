'use client'

import { useState } from 'react'
import { compressImage } from '@/lib/utils'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { toast } from 'sonner'

export type AIProvider = 'alibaba' | 'baidu' | 'gemini'

export type ImageQueueStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface ImageQueueItem {
  id: string
  file: File
  status: ImageQueueStatus
  progress: number
  result?: AIRecognitionResult[]
  error?: string
  retryCount: number
}

interface RecognizeOptions {
  provider?: AIProvider
}

interface BatchRecognizeCallbacks {
  onItemStart?: (item: ImageQueueItem) => void
  onItemProgress?: (item: ImageQueueItem, progress: number) => void
  onItemSuccess?: (item: ImageQueueItem, results: AIRecognitionResult[]) => void
  onItemError?: (item: ImageQueueItem, error: string) => void
  onComplete?: (items: ImageQueueItem[]) => void
}

/**
 * AI 识别 Hook
 */
export function useOCR() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [provider, setProvider] = useState<AIProvider>('alibaba')

  /**
   * 识别图片中的题目
   */
  const recognize = async (
    file: File,
    options?: RecognizeOptions
  ): Promise<AIRecognitionResult[]> => {
    setLoading(true)
    setProgress(0)

    try {
      // 1. 验证文件类型
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        throw new Error('不支持的图片格式，请上传 JPG、PNG、GIF 或 WebP 格式的图片')
      }

      // 2. 验证文件大小（最大 10MB）
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('图片文件过大，请上传小于 10MB 的图片')
      }

      setProgress(20)

      // 3. 压缩图片并转换为 base64（最大 1024px）
      const imageBase64 = await compressImage(file, 1024, 0.9)
      setProgress(40)

      // 4. 调用 API
      const currentProvider = options?.provider || provider
      const response = await fetch('/api/ai/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          provider: currentProvider,
        }),
      })

      setProgress(80)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '识别失败，请重试')
      }

      const data = await response.json()
      setProgress(100)

      if (!data.results || data.results.length === 0) {
        throw new Error('未识别到题目内容，请确保图片清晰可读')
      }

      return data.results
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
        throw error
      }

      toast.error('识别失败，请稍后重试')
      throw new Error('识别失败，请稍后重试')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 500) // 延迟重置进度条
    }
  }

  /**
   * 批量识别图片（带并发控制和重试机制）
   */
  const recognizeBatch = async (
    files: File[],
    callbacks?: BatchRecognizeCallbacks,
    concurrency: number = 2,
    maxRetries: number = 1
  ): Promise<ImageQueueItem[]> => {
    // 初始化队列项
    const items: ImageQueueItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      status: 'pending' as ImageQueueStatus,
      progress: 0,
      retryCount: 0,
    }))

    /**
     * 处理单张图片（带重试）
     */
    const processImage = async (item: ImageQueueItem): Promise<void> => {
      item.status = 'processing'
      callbacks?.onItemStart?.(item)

      try {
        // 1. 验证文件类型
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(item.file.type)) {
          throw new Error('不支持的图片格式')
        }

        // 2. 验证文件大小
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (item.file.size > maxSize) {
          throw new Error('图片文件过大')
        }

        item.progress = 20
        callbacks?.onItemProgress?.(item, 20)

        // 3. 压缩图片
        const imageBase64 = await compressImage(item.file, 1024, 0.9)
        item.progress = 40
        callbacks?.onItemProgress?.(item, 40)

        // 4. 调用 API
        const response = await fetch('/api/ai/recognize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64,
            provider,
          }),
        })

        item.progress = 80
        callbacks?.onItemProgress?.(item, 80)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '识别失败')
        }

        const data = await response.json()

        if (!data.results || data.results.length === 0) {
          throw new Error('未识别到题目内容')
        }

        // 成功
        item.status = 'success'
        item.progress = 100
        item.result = data.results
        callbacks?.onItemSuccess?.(item, data.results)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '识别失败'

        // 重试逻辑
        if (item.retryCount < maxRetries) {
          item.retryCount++
          await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒后重试
          return processImage(item)
        }

        // 重试次数用尽，标记为失败
        item.status = 'failed'
        item.error = errorMessage
        item.progress = 0
        callbacks?.onItemError?.(item, errorMessage)
      }
    }

    /**
     * 并发处理（分批）
     */
    const processBatch = async () => {
      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency)
        await Promise.allSettled(batch.map(item => processImage(item)))
      }
    }

    // 开始处理
    await processBatch()
    callbacks?.onComplete?.(items)

    return items
  }

  /**
   * 重试单个失败的图片
   */
  const retryImage = async (
    item: ImageQueueItem,
    callbacks?: {
      onStart?: (item: ImageQueueItem) => void
      onProgress?: (item: ImageQueueItem, progress: number) => void
      onSuccess?: (item: ImageQueueItem, results: AIRecognitionResult[]) => void
      onError?: (item: ImageQueueItem, error: string) => void
    }
  ): Promise<ImageQueueItem> => {
    // 重置状态
    item.status = 'processing'
    item.progress = 0
    item.error = undefined
    item.retryCount = 0
    callbacks?.onStart?.(item)

    try {
      // 1. 验证文件类型
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(item.file.type)) {
        throw new Error('不支持的图片格式')
      }

      // 2. 验证文件大小
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (item.file.size > maxSize) {
        throw new Error('图片文件过大')
      }

      item.progress = 20
      callbacks?.onProgress?.(item, 20)

      // 3. 压缩图片
      const imageBase64 = await compressImage(item.file, 1024, 0.9)
      item.progress = 40
      callbacks?.onProgress?.(item, 40)

      // 4. 调用 API
      const response = await fetch('/api/ai/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          provider,
        }),
      })

      item.progress = 80
      callbacks?.onProgress?.(item, 80)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '识别失败')
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        throw new Error('未识别到题目内容')
      }

      // 成功
      item.status = 'success'
      item.progress = 100
      item.result = data.results
      callbacks?.onSuccess?.(item, data.results)
      toast.success(`${item.file.name} 重试成功`)

      return item
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '识别失败'
      item.status = 'failed'
      item.error = errorMessage
      item.progress = 0
      callbacks?.onError?.(item, errorMessage)
      toast.error(`${item.file.name} 重试失败: ${errorMessage}`)
      throw error
    }
  }

  /**
   * 切换 AI 提供商
   */
  const switchProvider = (newProvider: AIProvider) => {
    setProvider(newProvider)
    const providerNames = {
      alibaba: '阿里云 DashScope',
      baidu: '百度 OCR',
      gemini: 'Google Gemini',
    }
    toast.success(`已切换到 ${providerNames[newProvider]} AI`)
  }

  return {
    recognize,
    recognizeBatch,
    retryImage,
    loading,
    progress,
    provider,
    switchProvider,
  }
}
