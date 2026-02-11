'use client'

import { useState } from 'react'
import { fileToBase64 } from '@/lib/utils'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { toast } from 'sonner'

export type AIProvider = 'alibaba' | 'baidu'

interface RecognizeOptions {
  provider?: AIProvider
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

      // 3. 转换为 base64
      const imageBase64 = await fileToBase64(file)
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
   * 切换 AI 提供商
   */
  const switchProvider = (newProvider: AIProvider) => {
    setProvider(newProvider)
    toast.success(`已切换到 ${newProvider === 'alibaba' ? '阿里云' : '百度'} AI`)
  }

  return {
    recognize,
    loading,
    progress,
    provider,
    switchProvider,
  }
}
