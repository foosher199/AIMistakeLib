import { createAdminClient } from '@/server/supabase'

async function createSignedUrlMap(
  images: Array<{ id: string; storage_path: string }>
) {
  const admin = createAdminClient()
  const entries = await Promise.all(
    images.map(async (image) => {
      const { data } = await admin.storage
        .from('mistake-private-images')
        .createSignedUrl(image.storage_path, 30 * 60)
      return [image.id, data?.signedUrl || null] as const
    })
  )
  return new Map(entries)
}

export async function attachSignedQuestionImages<
  T extends { id: string; image_url: string | null },
>(questions: T[], userId: string): Promise<T[]> {
  if (questions.length === 0) return questions
  const admin = createAdminClient()
  const { data: links } = await admin
    .from('mistake_question_images')
    .select('question_id, image_id, sort_order')
    .in('question_id', questions.map((question) => question.id))
    .order('sort_order', { ascending: true })
  if (!links?.length) return questions

  const imageIds = [...new Set(links.map((link) => link.image_id))]
  const { data: images } = await admin
    .from('mistake_images')
    .select('id, storage_path, mime_type, file_size, width, height')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('id', imageIds)
  const signedUrls = await createSignedUrlMap(images || [])
  const imageById = new Map((images || []).map((image) => [image.id, image]))
  const imagesByQuestion = new Map<string, Array<{
    id: string
    signedUrl: string
    sortOrder: number
    mimeType: string
    fileSize: number
    width: number | null
    height: number | null
  }>>()
  for (const link of links) {
    const url = signedUrls.get(link.image_id)
    const image = imageById.get(link.image_id)
    if (!url || !image) continue
    const assets = imagesByQuestion.get(link.question_id) || []
    assets.push({
      id: image.id,
      signedUrl: url,
      sortOrder: link.sort_order,
      mimeType: image.mime_type,
      fileSize: image.file_size,
      width: image.width,
      height: image.height,
    })
    imagesByQuestion.set(link.question_id, assets)
  }

  return questions.map((question) => ({
    ...question,
    images: imagesByQuestion.get(question.id) || [],
    image_url: imagesByQuestion.get(question.id)?.[0]?.signedUrl || question.image_url,
  }))
}

export async function attachSignedDraftImages<
  T extends { source_image_id: string | null; image_url: string | null },
>(drafts: T[], userId: string): Promise<T[]> {
  const imageIds = [...new Set(
    drafts.map((draft) => draft.source_image_id).filter((id): id is string => Boolean(id))
  )]
  if (imageIds.length === 0) return drafts

  const { data: images } = await createAdminClient()
    .from('mistake_images')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('id', imageIds)
  const signedUrls = await createSignedUrlMap(images || [])
  return drafts.map((draft) => ({
    ...draft,
    image_url: draft.source_image_id
      ? signedUrls.get(draft.source_image_id) || draft.image_url
      : draft.image_url,
  }))
}
