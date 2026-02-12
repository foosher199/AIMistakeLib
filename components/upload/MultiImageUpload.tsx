'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Plus } from 'lucide-react'
import { isValidImageFile, formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'

interface MultiImageUploadProps {
  onUpload: (files: File[]) => void
  loading?: boolean
  disabled?: boolean
  maxFiles?: number
}

interface FilePreview {
  file: File
  preview: string
}

export function MultiImageUpload({
  onUpload,
  loading = false,
  disabled = false,
  maxFiles = 10,
}: MultiImageUploadProps) {
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
  }

  const addFiles = (newFiles: File[]) => {
    // 验证文件数量
    const totalFiles = filePreviews.length + newFiles.length
    if (totalFiles > maxFiles) {
      toast.error(`最多上传 ${maxFiles} 张图片`)
      return
    }

    // 验证每个文件
    const validFiles: File[] = []
    for (const file of newFiles) {
      // 验证文件类型
      if (!isValidImageFile(file)) {
        toast.error(`${file.name}: 不支持的文件格式`)
        continue
      }

      // 验证文件大小
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error(`${file.name}: 文件过大，请上传小于 10MB 的图片`)
        continue
      }

      validFiles.push(file)
    }

    // 生成预览
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreviews((prev) => [
          ...prev,
          {
            file,
            preview: e.target?.result as string,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemove = (index: number) => {
    setFilePreviews((prev) => {
      const newPreviews = [...prev]
      // 释放 blob URL
      URL.revokeObjectURL(newPreviews[index].preview)
      newPreviews.splice(index, 1)
      return newPreviews
    })

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = () => {
    if (filePreviews.length === 0) {
      toast.error('请先选择图片')
      return
    }

    const files = filePreviews.map((fp) => fp.file)
    onUpload(files)
  }

  const handleClearAll = () => {
    filePreviews.forEach((fp) => URL.revokeObjectURL(fp.preview))
    setFilePreviews([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className="border-2 border-dashed border-[#c2cdd8] rounded-lg p-8 text-center hover:border-[#0070a0] hover:bg-[#f7f9fa] transition-colors cursor-pointer"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || loading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-[#cce5f3] rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-[#0070a0]" />
          </div>
          <div>
            <p className="text-lg font-medium text-[#1f1f1f] mb-1">
              点击上传或拖拽图片到此处
            </p>
            <p className="text-sm text-[#626a72]">
              支持 JPG、PNG、GIF、WebP 格式，最大 10MB
            </p>
            <p className="text-sm text-[#626a72] mt-1">
              最多可上传 {maxFiles} 张图片，当前已选 {filePreviews.length} 张
            </p>
          </div>
        </div>
      </div>

      {/* 预览列表 */}
      {filePreviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1f1f1f]">
              已选择 {filePreviews.length} 张图片
            </h3>
            {!loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-[#f43f5e] hover:text-[#f43f5e] hover:bg-[#ffe4e6]"
              >
                清空所有
              </Button>
            )}
          </div>

          {/* 图片网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filePreviews.map((item, index) => (
              <div
                key={index}
                className="relative group border border-[#dee5eb] rounded-lg overflow-hidden hover:border-[#0070a0] transition-colors"
              >
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-32 object-cover"
                />

                {/* 文件信息遮罩 */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                  <p className="text-white text-xs font-medium truncate w-full text-center mb-1">
                    {item.file.name}
                  </p>
                  <p className="text-white/80 text-xs">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>

                {/* 删除按钮 */}
                {!loading && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(index)
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}

                {/* 序号标签 */}
                <div className="absolute bottom-2 left-2 bg-[#0070a0] text-white text-xs font-bold rounded px-2 py-0.5">
                  {index + 1}
                </div>
              </div>
            ))}

            {/* 添加更多按钮 */}
            {!loading && filePreviews.length < maxFiles && (
              <button
                onClick={handleClick}
                className="h-32 border-2 border-dashed border-[#c2cdd8] rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#0070a0] hover:bg-[#f7f9fa] transition-colors"
              >
                <Plus className="w-8 h-8 text-[#626a72]" />
                <span className="text-sm text-[#626a72]">添加更多</span>
              </button>
            )}
          </div>

          {/* 开始识别按钮 */}
          {!loading && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                className="flex-1 bg-[#0070a0] hover:bg-[#005580]"
                disabled={disabled}
              >
                <Upload className="w-4 h-4 mr-2" />
                开始识别 {filePreviews.length} 张图片
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
