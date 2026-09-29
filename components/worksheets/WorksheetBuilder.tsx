'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Printer, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useQuestions } from '@/hooks/useQuestions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DIFFICULTIES, SUBJECTS, type Question } from '@/types/database'

export interface WorksheetSettings {
  columns: 1 | 2
  answerMode: 'none' | 'end' | 'inline'
  includeImages: boolean
  answerLines: number
  questionsPerPage: number
}

interface WorksheetBuilderProps {
  questionIds: string[]
  worksheetId?: string
  initialTitle?: string
  initialSettings?: Partial<WorksheetSettings>
}

export function WorksheetBuilder({ questionIds, worksheetId, initialTitle, initialSettings }: WorksheetBuilderProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle || '错题复习卷')
  const [orderedIds, setOrderedIds] = useState(questionIds)
  const [columns, setColumns] = useState<1 | 2>(initialSettings?.columns || 1)
  const [answerMode, setAnswerMode] = useState<'none' | 'end' | 'inline'>(initialSettings?.answerMode || 'end')
  const [includeImages, setIncludeImages] = useState(initialSettings?.includeImages ?? true)
  const [answerLines, setAnswerLines] = useState(initialSettings?.answerLines ?? 3)
  const [questionsPerPage, setQuestionsPerPage] = useState(initialSettings?.questionsPerPage ?? 6)
  const [saving, setSaving] = useState(false)
  const questionsQuery = useQuestions({ limit: 1000 })
  const questionMap = new Map((questionsQuery.data?.questions || []).map((question) => [question.id, question]))
  const selected = orderedIds.map((id) => questionMap.get(id)).filter((question): question is Question => Boolean(question))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= orderedIds.length) return
    setOrderedIds((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const save = async () => {
    if (!title.trim() || !orderedIds.length) return
    setSaving(true)
    try {
      const response = await fetch(worksheetId ? `/api/worksheets/${worksheetId}` : '/api/worksheets', {
        method: worksheetId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          questionIds: orderedIds,
          settings: { columns, answerMode, includeImages, answerLines, questionsPerPage },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败')
      toast.success(worksheetId ? '练习卷已更新' : '练习卷已保存')
      if (!worksheetId && data.worksheet?.id) router.replace(`/dashboard/worksheets/${data.worksheet.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存练习卷失败')
    } finally {
      setSaving(false)
    }
  }

  if (questionsQuery.isLoading) return <Loader2 className="mx-auto my-20 h-9 w-9 animate-spin text-[#0070a0]" />
  const pages = chunk(selected, questionsPerPage)

  return (
    <div className="worksheet-page space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/questions"><Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" />返回错题库</Button></Link>
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/dashboard/worksheets"><Button variant="outline">历史练习卷</Button></Link>
          <Button onClick={save} disabled={saving || selected.length === 0} variant="outline" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存
          </Button>
          <Button onClick={() => window.print()} className="gap-2 bg-[#0070a0] text-white hover:bg-[#005580]"><Printer className="h-4 w-4" />打印 / 保存 PDF</Button>
        </div>
      </div>

      <section className="no-print rounded-lg border border-gray-200 bg-white p-5">
        <h1 className="mb-4 text-xl font-semibold">复习卷设置</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <label className="space-y-2 text-sm lg:col-span-2"><span>标题</span><Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <Select label="排版" value={columns} onChange={(value) => setColumns(Number(value) as 1 | 2)} options={[['1', '单栏'], ['2', '双栏']]} />
          <Select label="答案" value={answerMode} onChange={(value) => setAnswerMode(value as typeof answerMode)} options={[['none', '不显示'], ['end', '卷尾答案'], ['inline', '题后答案']]} />
          <label className="space-y-2 text-sm"><span>答题空行</span><Input type="number" min="0" max="10" value={answerLines} onChange={(event) => setAnswerLines(Math.min(10, Math.max(0, Number(event.target.value))))} /></label>
          <Select label="每页题数" value={questionsPerPage} onChange={(value) => setQuestionsPerPage(Number(value))} options={[['4', '4 题'], ['6', '6 题'], ['8', '8 题'], ['10', '10 题']]} />
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={includeImages} onChange={(event) => setIncludeImages(event.target.checked)} className="h-4 w-4 accent-[#0070a0]" />包含原题图片</label>
        </div>
        <div className="mt-5 space-y-2 border-t pt-4">
          <p className="text-sm font-medium">题目顺序</p>
          {selected.map((question, index) => (
            <div key={question.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <span className="w-8 text-gray-500">{index + 1}.</span><span className="flex-1 truncate">{question.content}</span>
              <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" disabled={index === selected.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      {selected.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-gray-500">未找到所选题目，请返回错题库重新选择。</div>
      ) : (
        <div className="space-y-6 overflow-x-auto pb-2 print:space-y-0 print:overflow-visible print:pb-0">
          {pages.map((pageQuestions, pageIndex) => (
            <WorksheetPage key={pageIndex} title={title} page={pageIndex + 1} totalPages={pages.length} questions={pageQuestions} startIndex={pageIndex * questionsPerPage} columns={columns} includeImages={includeImages} answerLines={answerLines} answerMode={answerMode} />
          ))}
          {answerMode === 'end' && pages.map((pageQuestions, pageIndex) => (
            <article key={`answers-${pageIndex}`} className="worksheet-sheet worksheet-physical-page mx-auto bg-white p-10 shadow-sm">
              <h2 className="mb-5 border-b pb-2 text-xl font-bold">{title}－参考答案与解析（{pageIndex + 1}/{pages.length}）</h2>
              {pageQuestions.map((question, index) => <Answer key={question.id} question={question} index={pageIndex * questionsPerPage + index + 1} />)}
            </article>
          ))}
        </div>
      )}

      <style jsx global>{`
        .worksheet-sheet { width: 210mm; min-height: 297mm; }
        .worksheet-columns-2 { column-count: 2; column-gap: 12mm; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          nav, footer, .no-print { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .worksheet-page { display: block !important; }
          .worksheet-sheet { width: auto; min-height: 273mm; padding: 0 !important; box-shadow: none !important; }
          .worksheet-physical-page { break-after: page; }
          .worksheet-physical-page:last-child { break-after: auto; }
        }
      `}</style>
    </div>
  )
}

function WorksheetPage({ title, page, totalPages, questions, startIndex, columns, includeImages, answerLines, answerMode }: {
  title: string; page: number; totalPages: number; questions: Question[]; startIndex: number; columns: 1 | 2; includeImages: boolean; answerLines: number; answerMode: 'none' | 'end' | 'inline'
}) {
  return (
    <article className="worksheet-sheet worksheet-physical-page mx-auto bg-white p-10 shadow-sm">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{title || '错题复习卷'}</h1>
        <div className="mt-5 flex justify-between border-b border-gray-400 pb-2 text-sm"><span>姓名：____________</span><span>日期：____________</span><span>第 {page}/{totalPages} 页</span></div>
      </header>
      <div className={columns === 2 ? 'worksheet-columns-2' : ''}>
        {questions.map((question, index) => (
          <section key={question.id} className="worksheet-question mb-7 break-inside-avoid">
            <div className="mb-2 flex gap-2 text-xs text-gray-500">
              <span>{SUBJECTS.find((item) => item.id === question.subject)?.label || question.subject}</span><span>·</span><span>{question.category}</span><span>·</span><span>{DIFFICULTIES.find((item) => item.id === question.difficulty)?.label || question.difficulty}</span>
            </div>
            <p className="whitespace-pre-wrap leading-7"><strong>{startIndex + index + 1}.</strong> {question.content}</p>
            {includeImages && (question.images?.length ? question.images : question.image_url ? [{ id: 'legacy', signedUrl: question.image_url }] : []).map((image, imageIndex) => (
              <img key={image.id} src={image.signedUrl} alt={`第 ${startIndex + index + 1} 题图片 ${imageIndex + 1}`} className="mt-3 max-h-64 max-w-full object-contain" />
            ))}
            {Array.from({ length: answerLines }).map((_, line) => <div key={line} className="mt-5 border-b border-dashed border-gray-300" />)}
            {answerMode === 'inline' && <Answer question={question} />}
          </section>
        ))}
      </div>
    </article>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string | number; onChange: (value: string) => void; options: string[][] }) {
  return <label className="space-y-2 text-sm"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border bg-white px-3">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>
}

function Answer({ question, index }: { question: Pick<Question, 'answer' | 'explanation'>; index?: number }) {
  return <div className="mt-4 break-inside-avoid rounded border border-gray-200 bg-gray-50 p-3 text-sm"><p><strong>{index ? `${index}. ` : ''}答案：</strong>{question.answer}</p>{question.explanation && <p className="mt-2 whitespace-pre-wrap text-gray-700"><strong>解析：</strong>{question.explanation}</p>}</div>
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = []
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size))
  return pages
}
