import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthClient } from '@/server/supabase'

const WorksheetSchema = z.object({
  title: z.string().trim().min(1).max(100),
  questionIds: z.array(z.string().uuid()).min(1).max(100),
  settings: z.object({
    columns: z.union([z.literal(1), z.literal(2)]),
    answerMode: z.enum(['none', 'end', 'inline']),
    includeImages: z.boolean(),
    answerLines: z.number().int().min(0).max(10),
    questionsPerPage: z.number().int().min(1).max(100),
  }),
})

export async function GET(request: NextRequest) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
  const { data: worksheets, error, count } = await auth.supabase
    .from('mistake_worksheets')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (worksheets || []).map((worksheet) => worksheet.id)
  const { data: links } = ids.length
    ? await auth.supabase.from('mistake_worksheet_questions').select('worksheet_id').in('worksheet_id', ids)
    : { data: [] }
  const counts = new Map<string, number>()
  for (const link of links || []) counts.set(link.worksheet_id, (counts.get(link.worksheet_id) || 0) + 1)
  return NextResponse.json({
    worksheets: (worksheets || []).map((worksheet) => ({ ...worksheet, questionCount: counts.get(worksheet.id) || 0 })),
    total: count || 0,
  })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const validation = WorksheetSchema.safeParse(await request.json())
  if (!validation.success) return NextResponse.json({ error: '练习卷参数无效' }, { status: 400 })
  const uniqueIds = [...new Set(validation.data.questionIds)]
  const { data: questions } = await auth.supabase
    .from('mistake_questions')
    .select('id')
    .in('id', uniqueIds)
  if ((questions || []).length !== uniqueIds.length) {
    return NextResponse.json({ error: '部分题目不存在或无权访问' }, { status: 404 })
  }
  const { data: worksheet, error } = await auth.supabase
    .from('mistake_worksheets')
    .insert({
      user_id: auth.user.id,
      title: validation.data.title,
      settings: validation.data.settings,
    })
    .select('*')
    .single()
  if (error || !worksheet) return NextResponse.json({ error: error?.message || '保存练习卷失败' }, { status: 500 })
  const { error: linkError } = await auth.supabase.from('mistake_worksheet_questions').insert(
    uniqueIds.map((questionId, position) => ({ worksheet_id: worksheet.id, question_id: questionId, position }))
  )
  if (linkError) {
    await auth.supabase.from('mistake_worksheets').delete().eq('id', worksheet.id)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }
  return NextResponse.json({ worksheet: { ...worksheet, questionIds: uniqueIds } }, { status: 201 })
}
