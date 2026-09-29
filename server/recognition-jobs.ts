import { createAdminClient } from '@/server/supabase'

interface RunRecognitionJobOptions {
  jobId: string
  imageId: string
  mode: 'vision' | 'text' | 'baidu_understanding' | 'baidu_paper_cut'
  origin: string
  authHeaders: Record<string, string>
}

export async function runRecognitionJob(options: RunRecognitionJobOptions) {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: job } = await admin
    .from('mistake_ai_jobs')
    .select('status, attempt_count, max_attempts')
    .eq('id', options.jobId)
    .single()
  if (!job || job.status !== 'queued' || job.attempt_count >= job.max_attempts) return

  await admin.from('mistake_ai_jobs').update({
    status: 'processing',
    progress: 15,
    attempt_count: job.attempt_count + 1,
    started_at: now,
    finished_at: null,
    error_message: null,
    updated_at: now,
  }).eq('id', options.jobId)

  try {
    const response = await fetch(new URL('/api/ai/recognize', options.origin), {
      method: 'POST',
      headers: {
        ...options.authHeaders,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${options.jobId}:${job.attempt_count + 1}`,
      },
      body: JSON.stringify({ imageId: options.imageId, mode: options.mode }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || '识别任务执行失败')
    await admin.from('mistake_ai_jobs').update({
      status: 'succeeded',
      progress: 100,
      result: payload,
      error_message: null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', options.jobId)
  } catch (error) {
    await admin.from('mistake_ai_jobs').update({
      status: 'failed',
      progress: 0,
      error_message: error instanceof Error ? error.message.slice(0, 1000) : '识别任务执行失败',
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', options.jobId)
  }
}

export function forwardedAuthHeaders(request: Request) {
  const headers: Record<string, string> = {}
  const authorization = request.headers.get('authorization')
  const cookie = request.headers.get('cookie')
  if (authorization) headers.Authorization = authorization
  if (cookie) headers.Cookie = cookie
  return headers
}
