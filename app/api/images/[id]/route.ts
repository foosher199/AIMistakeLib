import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, getAuthClient } from '@/server/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: '图片 ID 无效' }, { status: 400 })
  }

  const { data: image, error } = await auth.supabase
    .from('mistake_images')
    .select('id, storage_path, mime_type, file_size, width, height')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (error || !image) {
    return NextResponse.json({ error: '图片不存在或无权访问' }, { status: 404 })
  }

  const { data: signed, error: signedError } = await createAdminClient().storage
    .from('mistake-private-images')
    .createSignedUrl(image.storage_path, 30 * 60)

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: '生成图片地址失败' }, { status: 500 })
  }

  return NextResponse.json({
    image: {
      id: image.id,
      mimeType: image.mime_type,
      fileSize: image.file_size,
      width: image.width,
      height: image.height,
    },
    signedUrl: signed.signedUrl,
    expiresIn: 1800,
  })
}
