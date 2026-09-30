'use client'

import { useState, useEffect, useRef } from 'react'
import { ImageQueueItem, ImageQueueStatus } from '@/hooks/useOCR'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface ImageQueueListProps {
  items: ImageQueueItem[]
  onRemove?: (id: string) => void
  onRetry?: (id: string) => void
}

export function ImageQueueList({ items, onRemove, onRetry }: ImageQueueListProps) {
  const [previews, setPreviews] = useState<Map<string, string>>(new Map())
  const previewsRef = useRef(previews)

  // 保持 ref 与 state 同步
  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  // 生成预览图
  useEffect(() => {
    const newPreviews = new Map<string, string>()

    items.forEach((item) => {
      if (!previewsRef.current.has(item.id)) {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.set(item.id, e.target?.result as string)
          setPreviews((prev) => new Map([...prev, ...newPreviews]))
        }
        reader.readAsDataURL(item.file)
      }
    })

    // 清理不再使用的预览
    return () => {
      setPreviews((prev) => {
        const next = new Map(prev)
        prev.forEach((url, id) => {
          if (!items.find((item) => item.id === id)) {
            URL.revokeObjectURL(url)
            next.delete(id)
          }
        })
        return next
      })
    }
  }, [items])

  const getStatusConfig = (status: ImageQueueStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: '等待中',
          color: 'text-[#625f77] bg-[#fff9f1]',
        }
      case 'processing':
        return {
          icon: Loader2,
          label: '识别中',
          color: 'text-[#5b55d6] bg-[#eeeafd]',
          animate: true,
        }
      case 'success':
        return {
          icon: CheckCircle2,
          label: '已完成',
          color: 'text-[#248b77] bg-[#e5f8f3]',
        }
      case 'failed':
        return {
          icon: XCircle,
          label: '失败',
          color: 'text-[#f43f5e] bg-[#ffe4e6]',
        }
    }
  }

  if (items.length === 0) {
    return null
  }

  const totalCount = items.length
  const successCount = items.filter(item => item.status === 'success').length
  const failedCount = items.filter(item => item.status === 'failed').length
  const processingCount = items.filter(item => item.status === 'processing').length

  return (
    <div className="space-y-4">
      {/* 整体进度 */}
      <div className="bg-white rounded-2xl border border-[#e4def5] shadow-[0_8px_24px_rgba(76,65,147,0.10)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#29264a]">
              识别进度 {successCount + failedCount}/{totalCount}
            </h3>
            {processingCount > 0 && (
              <Badge variant="outline" className="border-[#5b55d6] text-[#5b55d6]">
                进行中
              </Badge>
            )}
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-[#248b77]">成功 {successCount}</span>
            {failedCount > 0 && (
              <span className="text-[#f43f5e]">失败 {failedCount}</span>
            )}
          </div>
        </div>
        <Progress
          value={(successCount + failedCount) / totalCount * 100}
          className="h-2"
        />
      </div>

      {/* 图片列表 */}
      <div className="space-y-3">
        {items.map((item) => {
          const statusConfig = getStatusConfig(item.status)
          const StatusIcon = statusConfig.icon
          const preview = previews.get(item.id)

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#e4def5] shadow-[0_8px_24px_rgba(76,65,147,0.10)] p-4 hover:border-[#5b55d6] transition-colors"
            >
              <div className="flex gap-4">
                {/* 缩略图 */}
                <div className="flex-shrink-0">
                  {preview ? (
                    <img
                      src={preview}
                      alt={item.file.name}
                      className="w-20 h-20 object-cover rounded border border-[#e4def5]"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-[#fff9f1] rounded border border-[#e4def5] flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-[#625f77]" />
                    </div>
                  )}
                </div>

                {/* 信息区域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#29264a] truncate">
                        {item.file.name}
                      </h4>
                      <p className="text-sm text-[#625f77]">
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>

                    {/* 状态标签 */}
                    <Badge className={statusConfig.color}>
                      <StatusIcon
                        className={`w-3 h-3 mr-1 ${statusConfig.animate ? 'animate-spin' : ''}`}
                      />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* 进度条（仅处理中显示） */}
                  {item.status === 'processing' && (
                    <div className="mb-2">
                      <Progress value={item.progress} className="h-1.5" />
                      <p className="text-xs text-[#625f77] mt-1">
                        {item.progress}%
                      </p>
                    </div>
                  )}

                  {/* 成功信息 */}
                  {item.status === 'success' && item.result && (
                    <div className="flex items-center gap-2 text-sm text-[#248b77]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>识别出 {item.result.length} 道题目</span>
                    </div>
                  )}

                  {/* 错误信息 */}
                  {item.status === 'failed' && (
                    <div className="space-y-2">
                      <p className="text-sm text-[#f43f5e]">
                        {item.error || '识别失败'}
                        {item.retryCount > 0 && ` (已重试 ${item.retryCount} 次)`}
                      </p>
                      {onRetry && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRetry(item.id)}
                          className="gap-1 text-[#5b55d6] border-[#5b55d6] hover:bg-[#eeeafd]"
                        >
                          <RefreshCw className="w-3 h-3" />
                          重试
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* 删除按钮 */}
                {onRemove && item.status !== 'processing' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    className="text-[#625f77] hover:text-[#f43f5e] hover:bg-[#ffe4e6]"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
