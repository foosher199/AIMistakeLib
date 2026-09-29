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
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('id', imageIds)
  const signedUrls = await createSignedUrlMap(images || [])
  const firstImageByQuestion = new Map<string, string>()
  for (const link of links) {
    const url = signedUrls.get(link.image_id)
    if (url && !firstImageByQuestion.has(link.question_id)) {
      firstImageByQuestion.set(link.question_id, url)
    }
  }

  return questions.map((question) => ({
    ...question,
    image_url: firstImageByQuestion.get(question.id) || question.image_url,
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
