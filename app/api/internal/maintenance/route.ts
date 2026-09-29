import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/server/supabase'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const now = new Date()
  const { data: releasedReservations, error: releaseError } = await admin.rpc('release_stale_ai_reservations', {
    p_older_than: '15 minutes',
  })
  if (releaseError) return NextResponse.json({ error: releaseError.message }, { status: 500 })
  const staleJobCutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const { data: staleJobs } = await admin
    .from('mistake_ai_jobs')
    .select('id')
    .in('status', ['queued', 'processing'])
    .lt('updated_at', staleJobCutoff)
    .limit(100)
  if (staleJobs?.length) {
    await admin.from('mistake_ai_jobs').update({
      status: 'failed',
      progress: 0,
      error_message: '任务执行超时，请手动重试',
      finished_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).in('id', staleJobs.map((job) => job.id))
  }

  const { data: markedCount, error: markError } = await admin.rpc('mark_orphaned_mistake_images', {
    p_older_than: '1 hour',
  })
  if (markError) return NextResponse.json({ error: markError.message }, { status: 500 })

  const deleteCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { data: orphanedImages } = await admin
    .from('mistake_images')
    .select('id, storage_path')
    .eq('status', 'orphaned')
    .lt('updated_at', deleteCutoff)
    .limit(100)
  let deletedImages = 0
  for (const image of orphanedImages || []) {
    const { error: storageError } = await admin.storage.from('mistake-private-images').remove([image.storage_path])
    if (storageError) continue
    const { error: deleteError } = await admin.from('mistake_images').delete().eq('id', image.id).eq('status', 'orphaned')
    if (!deleteError) deletedImages++
  }

  return NextResponse.json({
    releasedReservations: releasedReservations || 0,
    staleJobs: staleJobs?.length || 0,
    markedImages: markedCount || 0,
    deletedImages,
  })
}
