import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, getAuthClient } from '@/server/supabase'
import { forwardedAuthHeaders, runRecognitionJob } from '@/server/recognition-jobs'

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: '任务 ID 无效' }, { status: 400 })
  const admin = createAdminClient()
  const { data: job } = await admin.from('mistake_ai_jobs').select('*').eq('id', id).eq('user_id', auth.user.id).single()
  if (!job) return NextResponse.json({ error: '任务不存在或无权访问' }, { status: 404 })
  if (job.status !== 'failed') return NextResponse.json({ error: '只有失败任务可以重试' }, { status: 409 })
  if (!job.image_id || job.attempt_count >= job.max_attempts) return NextResponse.json({ error: '任务已达到最大重试次数' }, { status: 409 })
  const { data: queued, error } = await admin.from('mistake_ai_jobs').update({
    status: 'queued', progress: 0, error_message: null, finished_at: null, updated_at: new Date().toISOString(),
  }).eq('id', id).select('*').single()
  if (error || !queued) return NextResponse.json({ error: error?.message || '重试任务失败' }, { status: 500 })
  const origin = process.env.APP_URL || request.nextUrl.origin
  const authHeaders = forwardedAuthHeaders(request)
  after(() => runRecognitionJob({ jobId: id, imageId: job.image_id!, mode: job.mode, origin, authHeaders }))
  return NextResponse.json({ job: queued }, { status: 202 })
}
