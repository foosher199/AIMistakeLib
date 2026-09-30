'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MultiImageUpload } from '@/components/upload/MultiImageUpload'
import { ImageQueueList } from '@/components/upload/ImageQueueList'
import { RecognitionResults } from '@/components/upload/RecognitionResults'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { useOCR, type RecognitionMode, type ImageQueueItem } from '@/hooks/useOCR'
import { useDeleteQuestions } from '@/hooks/useQuestions'
import type { AIRecognitionResult } from '@/contracts/ai'
import type { Question } from '@/types/database'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Camera, BookOpen, Check, Loader2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { RecognitionJobHistory } from '@/components/upload/RecognitionJobHistory'

export default function UploadPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { recognizeBatch, retryImage, mode, switchMode } = useOCR()

  const deleteQuestions = useDeleteQuestions()

  const [queueItems, setQueueItems] = useState<ImageQueueItem[]>([])
  const [uploadedResults, setUploadedResults] = useState<AIRecognitionResult[]>([])
  const [uploadedQuestionIds, setUploadedQuestionIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // 检查登录状态
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // 加载中或未登录时显示加载状态
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#5b55d6] animate-spin mx-auto mb-4" />
          <p className="text-[#625f77]">加载中...</p>
        </div>
      </div>
    )
  }

  const handleUpload = async (files: File[]) => {
    if (!user) {
      setPendingFiles(files)
      setLoginDialogOpen(true)
      toast.info('请先登录后再上传图片')
      return
    }
    processUpload(files)
  }

  const processUpload = async (files: File[]) => {
    setIsProcessing(true)
    setQueueItems([])

    try {
      const items = await recognizeBatch(
        files,
        {
          onItemStart: (item) => {
            setQueueItems((prev) => {
              const index = prev.findIndex((i) => i.id === item.id)
              if (index >= 0) {
                const newItems = [...prev]
                newItems[index] = { ...item }
                return newItems
              }
              return [...prev, { ...item }]
            })
          },
          onItemProgress: (item, progress) => {
            setQueueItems((prev) => {
              const index = prev.findIndex((i) => i.id === item.id)
              if (index >= 0) {
                const newItems = [...prev]
                newItems[index] = { ...item, progress }
                return newItems
              }
              return prev
            })
          },
          onItemSuccess: (_item, results, questionIds) => {
            setQueueItems((prev) => {
              const index = prev.findIndex((i) => i.id === _item.id)
              if (index >= 0) {
                const newItems = [...prev]
                newItems[index] = { ..._item, result: results }
                return newItems
              }
              return prev
            })
            setUploadedResults((prev) => [...prev, ...results])
            setUploadedQuestionIds((prev) => [...prev, ...(questionIds ?? [])])
          },
          onItemError: (item, error) => {
            setQueueItems((prev) => {
              const index = prev.findIndex((i) => i.id === item.id)
              if (index >= 0) {
                const newItems = [...prev]
                newItems[index] = { ...item, error }
                return newItems
              }
              return prev
            })
          },
          onComplete: (items) => {
            setIsProcessing(false)
            const successCount = items.filter((i) => i.status === 'success').length
            const failedCount = items.filter((i) => i.status === 'failed').length
            const questionCount = items.reduce((total, item) => total + (item.result?.length || 0), 0)

            if (successCount > 0) {
              toast.success(`成功识别并保存 ${questionCount} 道题目`)
            }
            if (failedCount > 0) {
              toast.error(`${failedCount} 张图片识别失败`)
            }
          },
        },
        2,
        1
      )

      setQueueItems(items)
    } catch (error) {
      console.error('Batch upload error:', error)
      setIsProcessing(false)
      toast.error('批量识别失败，请重试')
    }
  }

  const handleRemoveItem = (id: string) => {
    setQueueItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleRetryItem = async (id: string) => {
    const item = queueItems.find((i) => i.id === id)
    if (!item) return

    try {
      await retryImage(item, {
        onStart: (item) => {
          setQueueItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...item } : i))
          )
        },
        onProgress: (item, progress) => {
          setQueueItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...item, progress } : i
            )
          )
        },
        onSuccess: (_item, results, questionIds) => {
          setQueueItems((prev) =>
            prev.map((i) =>
              i.id === _item.id ? { ..._item, result: results } : i
            )
          )
          setUploadedResults((prev) => [...prev, ...results])
          setUploadedQuestionIds((prev) => [...prev, ...(questionIds ?? [])])
        },
        onError: (item, error) => {
          setQueueItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...item, error } : i
            )
          )
        },
      })
    } catch (error) {
      console.error('Retry error:', error)
    }
  }

  const handleEdit = async (_result: AIRecognitionResult, index: number) => {
    const questionId = uploadedQuestionIds[index]
    if (!questionId) return
    try {
      const response = await fetch(`/api/questions/${questionId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '加载题目失败')
      setEditingQuestion(data.question)
      setFormOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载题目失败')
    }
  }

  const removeResultIndices = (indices: number[]) => {
    const removed = new Set(indices)
    setUploadedResults((current) => current.filter((_, index) => !removed.has(index)))
    setUploadedQuestionIds((current) => current.filter((_, index) => !removed.has(index)))
  }

  const handleDeleteResult = async (index: number) => {
    const questionId = uploadedQuestionIds[index]
    if (!questionId || !confirm('确定要删除这道题目吗？删除后将同时从错题库移除。')) return
    try {
      await deleteQuestions.mutateAsync([questionId])
      removeResultIndices([index])
    } catch {
      // mutation 已显示错误提示。
    }
  }

  const handleDeleteSelected = async (indices: number[]) => {
    const questionIds = indices.map((index) => uploadedQuestionIds[index]).filter(Boolean)
    if (questionIds.length === 0) return
    await deleteQuestions.mutateAsync(questionIds)
    removeResultIndices(indices)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingQuestion(undefined)
    }
  }

  const handleLoginSuccess = () => {
    if (pendingFiles.length > 0) {
      toast.success('登录成功，开始识别图片')
      processUpload(pendingFiles)
      setPendingFiles([])
    }
  }

  const hasResults = uploadedResults.length > 0

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-3xl font-bold text-[#29264a] mb-2">上传错题</h1>
        <p className="text-[#625f77]">使用 AI 自动识别图片中的错题内容</p>
      </div>

      {/* AI 识别模式切换 */}
      <div className="bg-white rounded-2xl border border-[#e4def5] shadow-[0_8px_24px_rgba(76,65,147,0.10)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#5b55d6]" />
            <div>
              <p className="text-sm font-medium text-[#29264a]">AI 识别引擎</p>
              <p className="text-xs text-[#625f77] mt-0.5">
                {mode === 'text'
                  ? '文本模式：OCR + DeepSeek，速度快、成本低，适合纯文字题目'
                  : mode === 'baidu_understanding'
                    ? '百度模型：直接分析图片内容，适合复杂排版和图文混合题目'
                    : '阿里模型：阿里云 qwen-vl-plus 直接看图，精度高，适合含图形/公式题目'}
              </p>
            </div>
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => switchMode(v as RecognitionMode)}
            className="shrink-0"
          >
            <TabsList>
              <TabsTrigger value="baidu_understanding">百度模型</TabsTrigger>
              <TabsTrigger value="vision">阿里模型</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="bg-white rounded-2xl border border-[#e4def5] shadow-[0_8px_24px_rgba(76,65,147,0.10)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-[#625f77]" />
          <h2 className="text-lg font-semibold text-[#29264a]">
            上传图片
          </h2>
        </div>

        <MultiImageUpload
          onUpload={handleUpload}
          loading={isProcessing}
          maxFiles={10}
        />

        {/* 特性卡片 */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: '自动识别', desc: 'AI 智能识别题目内容' },
            { icon: BookOpen, title: '批量提取', desc: '一张图识别多道题目' },
            { icon: Check, title: '自动保存', desc: '识别结果直接存入错题库' },
          ].map((tip, index) => {
            const Icon = tip.icon
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-[#fff9f1] rounded-xl"
              >
                <div className="w-10 h-10 bg-[#eeeafd] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#5b55d6]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#29264a] text-sm">{tip.title}</h4>
                  <p className="text-xs text-[#625f77] mt-1">{tip.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 图片队列状态 */}
      {queueItems.length > 0 && (
        <ImageQueueList
          items={queueItems}
          onRemove={handleRemoveItem}
          onRetry={handleRetryItem}
        />
      )}

      <RecognitionJobHistory />

      {/* 本次识别结果 */}
      {hasResults && (
        <div className="bg-white rounded-2xl border border-[#e4def5] shadow-[0_8px_24px_rgba(76,65,147,0.10)] p-6">
          <RecognitionResults
            results={uploadedResults}
            questionIds={uploadedQuestionIds}
            onEdit={handleEdit}
            onDelete={handleDeleteResult}
            onDeleteSelected={handleDeleteSelected}
            deleting={deleteQuestions.isPending}
          />
        </div>
      )}

      {/* 空状态提示 */}
      {!hasResults && queueItems.length === 0 && !isProcessing && (
        <div className="bg-[#eeeafd]/30 border border-[#5b55d6]/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Inbox className="w-6 h-6 text-[#5b55d6]" />
            <h3 className="text-lg font-semibold text-[#29264a]">
              使用提示
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-[#625f77]">
            <li className="flex gap-2">
              <span className="text-[#5b55d6]">•</span>
              <span>上传图片后，AI 会自动识别题目并<strong>保存到错题库</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#5b55d6]">•</span>
              <span>识别完成后无需逐题保存，可直接在错题库查看</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#5b55d6]">•</span>
              <span>可勾选多道识别结果后批量删除</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#5b55d6]">•</span>
              <span>确保图片清晰，光线充足，避免遮挡</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#5b55d6]">•</span>
              <span>支持 JPG、PNG、GIF、WebP 格式，单张最大 10MB</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#5b55d6]">•</span>
              <span>支持一次上传多张图片（最多 10 张）</span>
            </li>
          </ul>
        </div>
      )}

      {/* 编辑表单 */}
      {editingQuestion && (
        <QuestionForm
          open={formOpen}
          onOpenChange={handleFormClose}
          question={editingQuestion}
        />
      )}

      {/* 登录弹窗 */}
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}
