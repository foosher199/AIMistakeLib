import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthClient } from '@/server/supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '请选择图片文件' }, { status: 400 })
  }
  const extension = mimeExtensions[file.type]
  if (!extension) {
    return NextResponse.json({ error: '仅支持 JPEG、PNG 和 WebP 图片' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '图片大小必须在 10MB 以内' }, { status: 400 })
  }

  const now = new Date()
  const imageId = randomUUID()
  const storagePath = `${auth.user.id}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${imageId}.${extension}`
  const admin = createAdminClient()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage
    .from('mistake-private-images')
    .upload(storagePath, bytes, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `图片上传失败：${uploadError.message}` }, { status: 500 })
  }

  const width = Number(formData.get('width')) || null
  const height = Number(formData.get('height')) || null
  const { data: image, error: insertError } = await admin
    .from('mistake_images')
    .insert({
      id: imageId,
      user_id: auth.user.id,
      storage_path: storagePath,
      original_filename: file.name || null,
      mime_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
      file_size: file.size,
      width,
      height,
      status: 'active',
    })
    .select('*')
    .single()

  if (insertError || !image) {
    await admin.storage.from('mistake-private-images').remove([storagePath])
    return NextResponse.json({ error: insertError?.message || '保存图片记录失败' }, { status: 500 })
  }

  const { data: signed, error: signedError } = await admin.storage
    .from('mistake-private-images')
    .createSignedUrl(storagePath, 15 * 60)

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: '图片已保存，但生成访问地址失败' }, { status: 500 })
  }

  return NextResponse.json({
    image: {
      id: image.id,
      storagePath: image.storage_path,
      mimeType: image.mime_type,
      fileSize: image.file_size,
      width: image.width,
      height: image.height,
    },
    signedUrl: signed.signedUrl,
  }, { status: 201 })
}
