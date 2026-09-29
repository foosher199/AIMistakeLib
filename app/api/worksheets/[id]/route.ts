import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthClient } from '@/server/supabase'

const UpdateSchema = z.object({
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

async function getOwnedWorksheet(request: NextRequest, id: string) {
  const auth = await getAuthClient(request)
  if (!auth) return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: worksheet } = await auth.supabase.from('mistake_worksheets').select('*').eq('id', id).single()
  if (!worksheet) return { ok: false as const, response: NextResponse.json({ error: '练习卷不存在' }, { status: 404 }) }
  return { ok: true as const, auth, worksheet }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: '练习卷 ID 无效' }, { status: 400 })
  const result = await getOwnedWorksheet(request, id)
  if (!result.ok) return result.response
  const { data: links, error } = await result.auth.supabase
    .from('mistake_worksheet_questions')
    .select('question_id, position')
    .eq('worksheet_id', id)
    .order('position')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ worksheet: { ...result.worksheet, questionIds: (links || []).map((link) => link.question_id) } })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getOwnedWorksheet(request, id)
  if (!result.ok) return result.response
  const validation = UpdateSchema.safeParse(await request.json())
  if (!validation.success) return NextResponse.json({ error: '练习卷参数无效' }, { status: 400 })
  const questionIds = [...new Set(validation.data.questionIds)]
  const { data: questions } = await result.auth.supabase.from('mistake_questions').select('id').in('id', questionIds)
  if ((questions || []).length !== questionIds.length) {
    return NextResponse.json({ error: '部分题目不存在或无权访问' }, { status: 404 })
  }
  const { error: updateError } = await result.auth.supabase
    .from('mistake_worksheets')
    .update({ title: validation.data.title, settings: validation.data.settings, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  const { error: deleteError } = await result.auth.supabase.from('mistake_worksheet_questions').delete().eq('worksheet_id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const { error: insertError } = await result.auth.supabase.from('mistake_worksheet_questions').insert(
    questionIds.map((questionId, position) => ({ worksheet_id: id, question_id: questionId, position }))
  )
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getOwnedWorksheet(request, id)
  if (!result.ok) return result.response
  const { error } = await result.auth.supabase.from('mistake_worksheets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
