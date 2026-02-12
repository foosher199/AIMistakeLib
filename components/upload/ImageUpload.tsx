'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { isValidImageFile, formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageUploadProps {
  onUpload: (file: File) => void
  loading?: boolean
  progress?: number
  disabled?: boolean
}

export function ImageUpload({ onUpload, loading = false, progress = 0, disabled = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!isValidImageFile(file)) {
      toast.error('不支持的文件格式，请上传 JPG、PNG、GIF 或 WebP 格式的图片')
      return
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('图片文件过大，请上传小于 10MB 的图片')
      return
    }

    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  const handleClear = () => {
    setPreview(null)
    setSelectedFile(null)
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

    const file = e.dataTransfer.files[0]
    if (!file) return

    // 验证文件类型
    if (!isValidImageFile(file)) {
      toast.error('不支持的文件格式，请上传 JPG、PNG、GIF 或 WebP 格式的图片')
      return
    }

    // 验证文件大小
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('图片文件过大，请上传小于 10MB 的图片')
      return
    }

    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setSelectedFile(file)
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      {!preview ? (
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
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-[#dee5eb] rounded-lg p-4 space-y-4">
          {/* 预览图片 */}
          <div className="relative">
            <img
              src={preview}
              alt="预览"
              className="max-w-full h-auto max-h-96 mx-auto rounded border border-[#dee5eb]"
            />
            {!loading && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleClear}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* 文件信息 */}
          {selectedFile && (
            <div className="flex items-center gap-3 text-sm text-[#626a72]">
              <ImageIcon className="w-4 h-4" />
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <span className="text-[#626a72]">{formatFileSize(selectedFile.size)}</span>
            </div>
          )}

          {/* 进度条 */}
          {loading && progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-[#626a72] text-center">
                识别中... {progress}%
              </p>
            </div>
          )}

          {/* 识别按钮 */}
          {!loading && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                className="flex-1 bg-[#0070a0] hover:bg-[#005580]"
                disabled={disabled}
              >
                <Upload className="w-4 h-4 mr-2" />
                开始识别
              </Button>
              <Button
                variant="outline"
                onClick={handleClick}
                disabled={disabled}
              >
                重新选择
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
