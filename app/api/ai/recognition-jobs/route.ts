import { after, NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createAdminClient, getAuthClient } from '@/server/supabase'
import { forwardedAuthHeaders, runRecognitionJob } from '@/server/recognition-jobs'

export const maxDuration = 300

const CreateJobSchema = z.object({
  imageId: z.string().uuid(),
  mode: z.enum(['vision', 'text', 'baidu_understanding', 'baidu_paper_cut']).default('vision'),
  idempotencyKey: z.string().min(8).max(200).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 10))
  const { data: jobs, error } = await auth.supabase
    .from('mistake_ai_jobs')
    .select('id, status, progress, mode, attempt_count, max_attempts, error_message, created_at, finished_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: jobs || [] })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const validation = CreateJobSchema.safeParse(await request.json())
  if (!validation.success) return NextResponse.json({ error: '识别任务参数无效' }, { status: 400 })
  const { data: image } = await auth.supabase
    .from('mistake_images')
    .select('id')
    .eq('id', validation.data.imageId)
    .eq('status', 'active')
    .single()
  if (!image) return NextResponse.json({ error: '图片不存在或无权访问' }, { status: 404 })

  const admin = createAdminClient()
  const idempotencyKey = validation.data.idempotencyKey || randomUUID()
  const { data: existing } = await admin
    .from('mistake_ai_jobs')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing) return NextResponse.json({ job: existing }, { status: 200 })

  const { data: job, error } = await admin.from('mistake_ai_jobs').insert({
    user_id: auth.user.id,
    operation: 'image_recognition',
    image_id: image.id,
    mode: validation.data.mode,
    idempotency_key: idempotencyKey,
  }).select('*').single()
  if (error || !job) return NextResponse.json({ error: error?.message || '创建识别任务失败' }, { status: 500 })

  const origin = process.env.APP_URL || request.nextUrl.origin
  const authHeaders = forwardedAuthHeaders(request)
  after(() => runRecognitionJob({ jobId: job.id, imageId: image.id, mode: validation.data.mode, origin, authHeaders }))
  return NextResponse.json({ job }, { status: 202 })
}
