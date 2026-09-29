'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { compressImage, uploadImageToSupabase } from '@/lib/utils'
import type { AIRecognitionResult } from '@/contracts/ai'

export type RecognitionMode = 'text' | 'vision' | 'baidu_understanding' | 'baidu_paper_cut'
export type ImageQueueStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface ImageQueueItem {
  id: string
  file: File
  status: ImageQueueStatus
  progress: number
  result?: AIRecognitionResult[]
  error?: string
  retryCount: number
  imageId?: string
  jobId?: string
}

interface RecognizeOptions { mode?: RecognitionMode }
interface RecognitionPayload { results: AIRecognitionResult[]; drafts?: Array<{ id: string }> }
interface JobResponse {
  job: {
    id: string
    status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
    progress: number
    result?: RecognitionPayload
    error_message?: string
  }
}
interface BatchRecognizeCallbacks {
  onItemStart?: (item: ImageQueueItem) => void
  onItemProgress?: (item: ImageQueueItem, progress: number) => void
  onItemSuccess?: (item: ImageQueueItem, results: AIRecognitionResult[], draftIds?: string[]) => void
  onItemError?: (item: ImageQueueItem, error: string) => void
  onComplete?: (items: ImageQueueItem[]) => void
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export function useOCR() {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mode, setMode] = useState<RecognitionMode>('vision')

  const dataUrlToFile = (dataUrl: string, fileName: string) => {
    const [header, content] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const binary = atob(content)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    return new File([bytes], fileName, { type: mime })
  }

  const validateAndUpload = async (file: File, onProgress?: (progress: number) => void) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('不支持的图片格式，请上传 JPG、PNG 或 WebP 图片')
    if (file.size > 10 * 1024 * 1024) throw new Error('图片文件过大，请上传小于 10MB 的图片')
    onProgress?.(10)
    const compressed = await compressImage(file, 1200, 0.8)
    onProgress?.(25)
    const uploaded = await uploadImageToSupabase(dataUrlToFile(compressed, file.name))
    onProgress?.(40)
    return uploaded
  }

  const waitForJob = async (jobId: string, onProgress?: (progress: number) => void): Promise<RecognitionPayload> => {
    const deadline = Date.now() + 6 * 60 * 1000
    while (Date.now() < deadline) {
      const response = await fetch(`/api/ai/recognition-jobs/${jobId}`, { cache: 'no-store' })
      const data: JobResponse & { error?: string } = await response.json()
      if (!response.ok) throw new Error(data.error || '查询识别任务失败')
      onProgress?.(Math.max(45, Math.min(95, data.job.progress)))
      if (data.job.status === 'succeeded') {
        if (!data.job.result?.results?.length) throw new Error('未识别到题目内容')
        return data.job.result
      }
      if (data.job.status === 'failed' || data.job.status === 'cancelled') {
        throw new Error(data.job.error_message || '识别任务失败')
      }
      await delay(2000)
    }
    throw new Error('识别任务等待超时，任务仍可稍后重试')
  }

  const createJob = async (imageId: string, selectedMode: RecognitionMode) => {
    const response = await fetch('/api/ai/recognition-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, mode: selectedMode, idempotencyKey: crypto.randomUUID() }),
    })
    const data: JobResponse & { error?: string } = await response.json()
    if (!response.ok) throw new Error(data.error || '创建识别任务失败')
    queryClient.invalidateQueries({ queryKey: ['recognition-jobs'] })
    return data.job.id
  }

  const retryJob = async (jobId: string) => {
    const response = await fetch(`/api/ai/recognition-jobs/${jobId}/retry`, { method: 'POST' })
    const data: JobResponse & { error?: string } = await response.json()
    if (!response.ok) throw new Error(data.error || '重试识别任务失败')
    queryClient.invalidateQueries({ queryKey: ['recognition-jobs'] })
  }

  const refreshCredits = () => {
    queryClient.invalidateQueries({ queryKey: ['credits'] })
    queryClient.invalidateQueries({ queryKey: ['credit-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['drafts'] })
  }

  const recognize = async (file: File, options?: RecognizeOptions): Promise<AIRecognitionResult[]> => {
    setLoading(true)
    setProgress(0)
    try {
      const uploaded = await validateAndUpload(file, setProgress)
      const jobId = await createJob(uploaded.imageId, options?.mode || mode)
      const payload = await waitForJob(jobId, setProgress)
      setProgress(100)
      refreshCredits()
      return payload.results
    } catch (error) {
      const message = error instanceof Error ? error.message : '识别失败，请稍后重试'
      toast.error(message)
      throw new Error(message)
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 500)
    }
  }

  const recognizeBatch = async (files: File[], callbacks?: BatchRecognizeCallbacks, concurrency = 2, maxRetries = 1) => {
    const items: ImageQueueItem[] = files.map((file, index) => ({ id: `${Date.now()}-${index}`, file, status: 'pending', progress: 0, retryCount: 0 }))
    const reportProgress = (item: ImageQueueItem, value: number) => {
      item.progress = value
      callbacks?.onItemProgress?.(item, value)
    }
    const processImage = async (item: ImageQueueItem) => {
      item.status = 'processing'
      callbacks?.onItemStart?.(item)
      try {
        const uploaded = await validateAndUpload(item.file, (value) => reportProgress(item, value))
        item.imageId = uploaded.imageId
        item.jobId = await createJob(uploaded.imageId, mode)
        let payload: RecognitionPayload
        try {
          payload = await waitForJob(item.jobId, (value) => reportProgress(item, value))
        } catch (error) {
          if (item.retryCount >= maxRetries) throw error
          item.retryCount++
          await retryJob(item.jobId)
          payload = await waitForJob(item.jobId, (value) => reportProgress(item, value))
        }
        item.status = 'success'
        item.progress = 100
        item.result = payload.results
        refreshCredits()
        callbacks?.onItemSuccess?.(item, payload.results, payload.drafts?.map((draft) => draft.id) || [])
      } catch (error) {
        item.status = 'failed'
        item.progress = 0
        item.error = error instanceof Error ? error.message : '识别失败'
        callbacks?.onItemError?.(item, item.error)
      }
    }
    for (let index = 0; index < items.length; index += concurrency) {
      await Promise.allSettled(items.slice(index, index + concurrency).map(processImage))
    }
    callbacks?.onComplete?.(items)
    return items
  }

  const retryImage = async (item: ImageQueueItem, callbacks?: {
    onStart?: (item: ImageQueueItem) => void
    onProgress?: (item: ImageQueueItem, progress: number) => void
    onSuccess?: (item: ImageQueueItem, results: AIRecognitionResult[], draftIds?: string[]) => void
    onError?: (item: ImageQueueItem, error: string) => void
  }) => {
    item.status = 'processing'
    item.progress = 0
    item.error = undefined
    callbacks?.onStart?.(item)
    try {
      if (!item.imageId) {
        const uploaded = await validateAndUpload(item.file, (value) => callbacks?.onProgress?.(item, value))
        item.imageId = uploaded.imageId
      }
      if (item.jobId) await retryJob(item.jobId)
      else item.jobId = await createJob(item.imageId, mode)
      const payload = await waitForJob(item.jobId, (value) => {
        item.progress = value
        callbacks?.onProgress?.(item, value)
      })
      item.status = 'success'
      item.progress = 100
      item.result = payload.results
      item.retryCount++
      refreshCredits()
      callbacks?.onSuccess?.(item, payload.results, payload.drafts?.map((draft) => draft.id) || [])
      toast.success(`${item.file.name} 重试成功`)
      return item
    } catch (error) {
      item.status = 'failed'
      item.progress = 0
      item.error = error instanceof Error ? error.message : '识别失败'
      callbacks?.onError?.(item, item.error)
      toast.error(`${item.file.name} 重试失败：${item.error}`)
      throw error
    }
  }

  const switchMode = (newMode: RecognitionMode) => {
    setMode(newMode)
    const names = { text: '文本模式 (OCR + DeepSeek)', vision: '阿里模型', baidu_understanding: '百度模型', baidu_paper_cut: '百度试卷切题' }
    toast.success(`已切换到 ${names[newMode]}`)
  }

  return { recognize, recognizeBatch, retryImage, loading, progress, mode, switchMode }
}
