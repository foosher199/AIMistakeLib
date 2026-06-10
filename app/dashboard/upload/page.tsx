'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { MultiImageUpload } from '@/components/upload/MultiImageUpload'
import { ImageQueueList } from '@/components/upload/ImageQueueList'
import { RecognitionResults } from '@/components/upload/RecognitionResults'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { useOCR, type RecognitionMode, type ImageQueueItem } from '@/hooks/useOCR'
import { useDrafts, useSaveDraft, useDeleteDraft, useDeleteDrafts } from '@/hooks/useDrafts'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import type { Draft } from '@/types/database'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Camera, BookOpen, Check, Loader2, Inbox } from 'lucide-react'
import { toast } from 'sonner'

/**
 * 将 Draft 转换为 AIRecognitionResult
 */
function draftToResult(draft: Draft): AIRecognitionResult {
  return {
    content: draft.content,
    subject: draft.subject as AIRecognitionResult['subject'],
    category: draft.category,
    difficulty: draft.difficulty as AIRecognitionResult['difficulty'],
    answer: draft.answer,
    explanation: draft.explanation ?? undefined,
    confidence: draft.confidence ?? undefined,
  }
}

export default function UploadPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { recognizeBatch, retryImage, mode, switchMode } = useOCR()

  // 草稿相关 hooks
  const { data: serverDrafts, isLoading: draftsLoading } = useDrafts()
  const saveDraftMutation = useSaveDraft()
  const deleteDraftMutation = useDeleteDraft()
  const deleteDraftsMutation = useDeleteDrafts()

  const [queueItems, setQueueItems] = useState<ImageQueueItem[]>([])
  // 新上传的识别结果（尚未在草稿表中的）
  const [uploadedResults, setUploadedResults] = useState<AIRecognitionResult[]>([])
  const [uploadedDraftIds, setUploadedDraftIds] = useState<string[]>([])
  // 已从显示列表中移除的草稿ID（保存或删除后）
  const [removedDraftIds, setRemovedDraftIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingResult, setEditingResult] = useState<AIRecognitionResult | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // 计算要显示的完整结果列表（服务器草稿 + 新上传结果）
  const displayResults = useMemo(() => {
    const draftResults = (serverDrafts ?? [])
      .filter((d) => !removedDraftIds.has(d.id))
      .map(draftToResult)
    return [...draftResults, ...uploadedResults]
  }, [serverDrafts, uploadedResults, removedDraftIds])

  const displayDraftIds = useMemo(() => {
    const draftIds = (serverDrafts ?? [])
      .filter((d) => !removedDraftIds.has(d.id))
      .map((d) => d.id)
    return [...draftIds, ...uploadedDraftIds]
  }, [serverDrafts, uploadedDraftIds, removedDraftIds])

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
          onItemSuccess: (_item, results, draftIds) => {
            setQueueItems((prev) => {
              const index = prev.findIndex((i) => i.id === _item.id)
              if (index >= 0) {
                const newItems = [...prev]
                newItems[index] = { ..._item, result: results }
                return newItems
              }
              return prev
            })
            // 追加到上传结果列表
            setUploadedResults((prev) => [...prev, ...results])
            setUploadedDraftIds((prev) => [...prev, ...(draftIds ?? [])])
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
        onSuccess: (_item, results, draftIds) => {
          setQueueItems((prev) =>
            prev.map((i) =>
              i.id === _item.id ? { ..._item, result: results } : i
            )
          )
          setUploadedResults((prev) => [...prev, ...results])
          setUploadedDraftIds((prev) => [...prev, ...(draftIds ?? [])])
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

  const handleEdit = (result: AIRecognitionResult) => {
    setEditingResult(result)
    setFormOpen(true)
  }

  const handleClearResults = async () => {
    // 删除所有服务器草稿（批量删除）
    const allServerIds = (serverDrafts ?? []).map((d) => d.id)
    if (allServerIds.length > 0) {
      try {
        await deleteDraftsMutation.mutateAsync(allServerIds)
      } catch {
        // 删除失败不影响后续清理
      }
    }

    // 清空本地状态
    setUploadedResults([])
    setUploadedDraftIds([])
    setRemovedDraftIds(new Set())
    setQueueItems([])
  }

  const handleDeleteResult = async (index: number) => {
    const draftId = displayDraftIds[index]
    if (draftId) {
      // 检查是服务器草稿还是新上传的
      const isUploaded = index >= (serverDrafts?.length ?? 0) - [...removedDraftIds].filter((id) =>
        serverDrafts?.some((d) => d.id === id)
      ).length
      if (isUploaded) {
        // 新上传的，直接从 uploaded 中移除
        const uploadIndex = index - (displayDraftIds.length - uploadedResults.length)
        setUploadedResults((prev) => prev.filter((_, i) => i !== uploadIndex))
        setUploadedDraftIds((prev) => prev.filter((_, i) => i !== uploadIndex))
      } else {
        // 服务器草稿，删除数据库记录并从 UI 移除
        try {
          await deleteDraftMutation.mutateAsync(draftId)
        } catch {
          // 删除失败不影响 UI 更新
        }
        setRemovedDraftIds((prev) => new Set(prev).add(draftId))
      }
    }
    toast.success('已删除该题目')
  }

  const handleSaveDraft = async (draftId: string) => {
    try {
      await saveDraftMutation.mutateAsync(draftId)
      // 标记为已移除，useMemo 会自动过滤掉
      setRemovedDraftIds((prev) => new Set(prev).add(draftId))
    } catch {
      // 错误已在 hook 中处理
    }
  }

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDraftMutation.mutateAsync(draftId)
      // 标记为已移除，useMemo 会自动过滤掉
      setRemovedDraftIds((prev) => new Set(prev).add(draftId))
    } catch {
      // 错误已在 hook 中处理
    }
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingResult(undefined)
    }
  }

  const handleLoginSuccess = () => {
    if (pendingFiles.length > 0) {
      toast.success('登录成功，开始识别图片')
      processUpload(pendingFiles)
      setPendingFiles([])
    }
  }

  const hasResults = displayResults.length > 0

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-3xl font-bold text-[#1f1f1f] mb-2">上传错题</h1>
        <p className="text-[#626a72]">使用 AI 自动识别图片中的错题内容</p>
      </div>

      {/* AI 识别模式切换 */}
      <div className="bg-white rounded-lg border border-[#dee5eb] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#0070a0]" />
            <div>
              <p className="text-sm font-medium text-[#1f1f1f]">AI 识别引擎</p>
              <p className="text-xs text-[#626a72] mt-0.5">
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
          >
            <TabsList>
              <TabsTrigger value="baidu_understanding">百度模型</TabsTrigger>
              <TabsTrigger value="vision">阿里模型</TabsTrigger>
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
            { icon: Check, title: '自动暂存', desc: '识别结果自动保存，随时处理' },
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

      {/* 识别结果 / 草稿列表 */}
      {hasResults && (
        <div className="bg-white rounded-lg border border-[#dee5eb] p-6">
          <RecognitionResults
            results={displayResults}
            draftIds={displayDraftIds}
            onEdit={handleEdit}
            onDelete={handleDeleteResult}
            onClear={handleClearResults}
            onSaveDraft={handleSaveDraft}
            onDeleteDraft={handleDeleteDraft}
            savingDraftId={saveDraftMutation.isPending ? saveDraftMutation.variables : undefined}
            deletingDraftId={deleteDraftMutation.isPending ? deleteDraftMutation.variables : undefined}
          />
        </div>
      )}

      {/* 加载草稿中 */}
      {draftsLoading && !hasResults && (
        <div className="bg-white rounded-lg border border-[#dee5eb] p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
            <span className="text-gray-600">加载草稿...</span>
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {!hasResults && !draftsLoading && queueItems.length === 0 && !isProcessing && (
        <div className="bg-[#cce5f3]/30 border border-[#0070a0]/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Inbox className="w-6 h-6 text-[#0070a0]" />
            <h3 className="text-lg font-semibold text-[#1f1f1f]">
              使用提示
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-[#626a72]">
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>上传图片后，AI 会自动识别题目并<strong>暂存到草稿箱</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>您可以随时关闭页面，识别结果不会丢失</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>确认无误后点击保存，题目才会进入您的错题库</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>确保图片清晰，光线充足，避免遮挡</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>支持 JPG、PNG、GIF、WebP 格式，单张最大 10MB</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0070a0]">•</span>
              <span>支持一次上传多张图片（最多 10 张）</span>
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
