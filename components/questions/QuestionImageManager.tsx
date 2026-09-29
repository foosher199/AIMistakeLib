'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Question, QuestionImageAsset } from '@/types/database'
import { compressImage, uploadImageToSupabase } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, content] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return new File([bytes], fileName, { type: mime })
}

export function QuestionImageManager({ question }: { question: Question }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<QuestionImageAsset[]>(question.images || [])
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['questions'] })
    await queryClient.invalidateQueries({ queryKey: ['question', question.id] })
  }

  const addFiles = async (files: File[]) => {
    if (!files.length) return
    if (images.length + files.length > 10) {
      toast.error('每道题最多关联 10 张图片')
      return
    }
    setBusy(true)
    try {
      const uploaded: Array<{ imageId: string; signedUrl: string }> = []
      for (const file of files) {
        const compressed = await compressImage(file, 1600, 0.85)
        uploaded.push(await uploadImageToSupabase(dataUrlToFile(compressed, file.name)))
      }
      const response = await fetch(`/api/questions/${question.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: uploaded.map((item) => item.imageId) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '关联图片失败')
      setImages((current) => [
        ...current,
        ...uploaded.map((item, index) => ({
          id: item.imageId,
          signedUrl: item.signedUrl,
          sortOrder: current.length + index,
          mimeType: 'image/jpeg',
          fileSize: 0,
          width: null,
          height: null,
        })),
      ])
      await refresh()
      toast.success('图片已添加')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '添加图片失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const reorder = async (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    const previous = images
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setImages(next.map((image, index) => ({ ...image, sortOrder: index })))
    const response = await fetch(`/api/questions/${question.id}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds: next.map((image) => image.id) }),
    })
    if (!response.ok) {
      setImages(previous)
      toast.error('图片排序保存失败')
      return
    }
    await refresh()
  }

  const remove = async (imageId: string) => {
    if (!confirm('确定从这道题中移除该图片吗？')) return
    setBusy(true)
    try {
      const response = await fetch(`/api/questions/${question.id}/images/${imageId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '移除图片失败')
      setImages((current) => current.filter((image) => image.id !== imageId))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移除图片失败')
    } finally {
      setBusy(false)
    }
  }

  const visibleImages = images.length
    ? images
    : question.image_url
      ? [{ id: 'legacy', signedUrl: question.image_url, sortOrder: 0, mimeType: '', fileSize: 0, width: null, height: null }]
      : []

  return (
    <div className="mb-3 space-y-2">
      {visibleImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleImages.map((image, index) => (
            <img key={image.id} src={image.signedUrl} alt={`题目图片 ${index + 1}`} className="h-36 w-full rounded border border-[#dee5eb] object-contain" />
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1">
        <ImagePlus className="h-4 w-4" />管理图片{images.length ? `（${images.length}）` : ''}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>题目图片</DialogTitle></DialogHeader>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => addFiles(Array.from(event.target.files || []))}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={busy || images.length >= 10} className="gap-2 bg-[#0070a0] text-white hover:bg-[#005580]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            添加图片
          </Button>
          {images.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#626a72]">暂无新存储图片；旧图片仍会继续显示。</p>
          ) : (
            <div className="space-y-3">
              {images.map((image, index) => (
                <div key={image.id} className="flex items-center gap-3 rounded border p-3">
                  <img src={image.signedUrl} alt={`图片 ${index + 1}`} className="h-20 w-24 rounded object-contain" />
                  <span className="flex-1 text-sm">图片 {index + 1}</span>
                  <Button variant="outline" size="sm" disabled={index === 0 || busy} onClick={() => reorder(index, index - 1)}><ArrowLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={index === images.length - 1 || busy} onClick={() => reorder(index, index + 1)}><ArrowRight className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(image.id)} className="text-[#f43f5e]"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
