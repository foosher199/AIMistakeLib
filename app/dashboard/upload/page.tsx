'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MultiImageUpload } from '@/components/upload/MultiImageUpload'
import { ImageQueueList } from '@/components/upload/ImageQueueList'
import { RecognitionResults } from '@/components/upload/RecognitionResults'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { useOCR, type AIProvider, type ImageQueueItem } from '@/hooks/useOCR'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Camera, BookOpen, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function UploadPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { recognizeBatch, retryImage, provider, switchProvider } = useOCR()
  const [queueItems, setQueueItems] = useState<ImageQueueItem[]>([])
  const [allResults, setAllResults] = useState<AIRecognitionResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingResult, setEditingResult] = useState<AIRecognitionResult | undefined>()
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
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  const handleUpload = async (files: File[]) => {
    // 检查登录状态
    if (!user) {
      setPendingFiles(files)
      setLoginDialogOpen(true)
      toast.info('请先登录后再上传图片')
      return
    }

    // 已登录，继续上传
    processUpload(files)
  }

  const processUpload = async (files: File[]) => {
    setIsProcessing(true)
    setQueueItems([])
    setAllResults([])

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
          onItemSuccess: (item, results) => {
            setQueueItems((prev) => {
              const index = prev.findIndex((i) => i.id === item.id)
              if (index >= 0) {
                const newItems = [...prev]
                newItems[index] = { ...item, result: results }
                return newItems
              }
              return prev
            })
            // 汇总所有结果
            setAllResults((prev) => [...prev, ...results])
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

            if (successCount > 0) {
              toast.success(`成功识别 ${successCount} 张图片`)
            }
            if (failedCount > 0) {
              toast.error(`${failedCount} 张图片识别失败`)
            }
          },
        },
        2, // 并发数：2
        1  // 最大重试次数：1
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
        onSuccess: (item, results) => {
          setQueueItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...item, result: results } : i
            )
          )
          // 添加到总结果中
          setAllResults((prev) => [...prev, ...results])
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
      // 错误已在 retryImage 中处理
      console.error('Retry error:', error)
    }
  }

  const handleEdit = (result: AIRecognitionResult) => {
    setEditingResult(result)
    setFormOpen(true)
  }

  const handleClearResults = () => {
    setAllResults([])
    setQueueItems([])
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingResult(undefined)
    }
  }

  const handleLoginSuccess = () => {
    // 登录成功后，如果有待处理的文件，自动上传
    if (pendingFiles.length > 0) {
      toast.success('登录成功，开始识别图片')
      processUpload(pendingFiles)
      setPendingFiles([])
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-3xl font-bold text-[#1f1f1f] mb-2">上传错题</h1>
        <p className="text-[#626a72]">使用 AI 自动识别图片中的错题内容</p>
      </div>

      {/* AI 提供商切换 */}
      <div className="bg-white rounded-lg border border-[#dee5eb] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#0070a0]" />
            <div>
              <p className="text-sm font-medium text-[#1f1f1f]">AI 识别引擎</p>
              <p className="text-xs text-[#626a72] mt-0.5">
                选择不同的 AI 提供商以获得最佳识别效果
              </p>
            </div>
          </div>

          <Tabs
            value={provider}
            onValueChange={(v) => switchProvider(v as AIProvider)}
          >
            <TabsList>
              <TabsTrigger value="alibaba">阿里云</TabsTrigger>
              <TabsTrigger value="baidu">百度</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="bg-white rounded-lg border border-[#dee5eb] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-[#626a72]" />
          <h2 className="text-lg font-semibold text-[#1f1f1f]">
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
            { icon: Check, title: '灵活保存', desc: '选择有效题目保存' },
          ].map((tip, index) => {
            const Icon = tip.icon
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-[#f7f9fa] rounded-xl"
              >
                <div className="w-10 h-10 bg-[#cce5f3] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#0070a0]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1f1f1f] text-sm">{tip.title}</h4>
                  <p className="text-xs text-[#626a72] mt-1">{tip.desc}</p>
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

      {/* 识别结果 */}
      {allResults.length > 0 && (
        <div className="bg-white rounded-lg border border-[#dee5eb] p-6">
          <RecognitionResults
            results={allResults}
            onEdit={handleEdit}
            onClear={handleClearResults}
          />
        </div>
      )}

      {/* 提示信息 */}
      {allResults.length === 0 && queueItems.length === 0 && !isProcessing && (
        <div className="bg-[#cce5f3]/30 border border-[#0070a0]/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#1f1f1f] mb-3">
            使用提示
          </h3>
          <ul className="space-y-2 text-sm text-[#626a72]">
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>确保图片清晰，光线充足</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>尽量让题目内容完整，避免遮挡</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>支持 JPG、PNG、GIF、WebP 格式</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>单张图片最大 10MB</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>支持一次上传多张图片（最多 10 张）</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>每张图片可识别多道题目，系统会自动分离</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>
                如果阿里云识别效果不佳，可尝试切换到百度引擎
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* 编辑表单 */}
      {editingResult && (
        <QuestionForm
          open={formOpen}
          onOpenChange={handleFormClose}
          initialData={{
            content: editingResult.content,
            subject: editingResult.subject,
            category: editingResult.category,
            difficulty: editingResult.difficulty,
            answer: editingResult.answer,
            explanation: editingResult.explanation,
          }}
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
