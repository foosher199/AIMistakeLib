import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, getAuthClient } from '@/server/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(imageId).success) {
    return NextResponse.json({ error: '参数无效' }, { status: 400 })
  }
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: question } = await auth.supabase
    .from('mistake_questions')
    .select('id')
    .eq('id', id)
    .single()
  if (!question) return NextResponse.json({ error: '题目不存在或无权访问' }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('mistake_question_images')
    .delete()
    .eq('question_id', id)
    .eq('image_id', imageId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ count: linkCount }, { count: draftCount }] = await Promise.all([
    admin.from('mistake_question_images').select('*', { count: 'exact', head: true }).eq('image_id', imageId),
    admin.from('mistake_drafts').select('*', { count: 'exact', head: true }).eq('source_image_id', imageId),
  ])
  if ((linkCount || 0) === 0 && (draftCount || 0) === 0) {
    await admin.from('mistake_images').update({ status: 'orphaned', updated_at: new Date().toISOString() }).eq('id', imageId)
  }
  return NextResponse.json({ success: true })
}
