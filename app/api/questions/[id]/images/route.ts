import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, getAuthClient } from '@/server/supabase'

const AddImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(10),
})

const ReorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).max(10),
})

async function requireOwnedQuestion(request: NextRequest, questionId: string) {
  const auth = await getAuthClient(request)
  if (!auth) return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: question } = await auth.supabase
    .from('mistake_questions')
    .select('id')
    .eq('id', questionId)
    .single()
  if (!question) return { ok: false as const, response: NextResponse.json({ error: '题目不存在或无权访问' }, { status: 404 }) }
  return { ok: true as const, auth }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: '题目 ID 无效' }, { status: 400 })
  }
  const ownership = await requireOwnedQuestion(request, id)
  if (!ownership.ok) return ownership.response

  const validation = AddImagesSchema.safeParse(await request.json())
  if (!validation.success) return NextResponse.json({ error: '图片参数无效' }, { status: 400 })

  const admin = createAdminClient()
  const { data: ownedImages } = await admin
    .from('mistake_images')
    .select('id')
    .eq('user_id', ownership.auth.user.id)
    .eq('status', 'active')
    .in('id', validation.data.imageIds)
  if ((ownedImages || []).length !== new Set(validation.data.imageIds).size) {
    return NextResponse.json({ error: '部分图片不存在或无权使用' }, { status: 404 })
  }

  const { data: existing } = await admin
    .from('mistake_question_images')
    .select('image_id, sort_order')
    .eq('question_id', id)
  const existingIds = new Set((existing || []).map((item) => item.image_id))
  const nextImages = validation.data.imageIds.filter((imageId) => !existingIds.has(imageId))
  if ((existing?.length || 0) + nextImages.length > 10) {
    return NextResponse.json({ error: '每道题最多关联 10 张图片' }, { status: 400 })
  }
  const start = (existing || []).reduce((max, item) => Math.max(max, item.sort_order + 1), 0)
  if (nextImages.length) {
    const { error } = await admin.from('mistake_question_images').insert(
      nextImages.map((imageId, index) => ({ question_id: id, image_id: imageId, sort_order: start + index }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ownership = await requireOwnedQuestion(request, id)
  if (!ownership.ok) return ownership.response
  const validation = ReorderImagesSchema.safeParse(await request.json())
  if (!validation.success) return NextResponse.json({ error: '图片排序参数无效' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('mistake_question_images')
    .select('image_id')
    .eq('question_id', id)
  const current = new Set((existing || []).map((item) => item.image_id))
  const requested = new Set(validation.data.imageIds)
  if (current.size !== requested.size || [...current].some((imageId) => !requested.has(imageId))) {
    return NextResponse.json({ error: '排序列表必须包含题目的全部图片' }, { status: 400 })
  }

  for (let index = 0; index < validation.data.imageIds.length; index++) {
    const { error } = await admin
      .from('mistake_question_images')
      .update({ sort_order: index + 1000 })
      .eq('question_id', id)
      .eq('image_id', validation.data.imageIds[index])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  for (let index = 0; index < validation.data.imageIds.length; index++) {
    const { error } = await admin
      .from('mistake_question_images')
      .update({ sort_order: index })
      .eq('question_id', id)
      .eq('image_id', validation.data.imageIds[index])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
