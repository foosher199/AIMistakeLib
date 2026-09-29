import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthClient } from '@/server/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: '任务 ID 无效' }, { status: 400 })
  const { data: job, error } = await auth.supabase.from('mistake_ai_jobs').select('*').eq('id', id).single()
  if (error || !job) return NextResponse.json({ error: '任务不存在或无权访问' }, { status: 404 })
  return NextResponse.json({ job })
}
