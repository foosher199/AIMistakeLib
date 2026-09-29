'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { useQuestions } from '@/hooks/useQuestions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DIFFICULTIES, SUBJECTS } from '@/types/database'

export function WorksheetBuilder({ questionIds }: { questionIds: string[] }) {
  const [title, setTitle] = useState('错题复习卷')
  const [columns, setColumns] = useState<1 | 2>(1)
  const [answerMode, setAnswerMode] = useState<'none' | 'end' | 'inline'>('end')
  const [includeImages, setIncludeImages] = useState(true)
  const [answerLines, setAnswerLines] = useState(3)
  const questionsQuery = useQuestions({ limit: 1000 })
  const selected = (questionsQuery.data?.questions || []).filter((question) =>
    questionIds.includes(question.id)
  )

  if (questionsQuery.isLoading) {
    return <Loader2 className="mx-auto my-20 h-9 w-9 animate-spin text-[#0070a0]" />
  }

  return (
    <div className="worksheet-page space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/questions">
          <Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" />返回错题库</Button>
        </Link>
        <Button onClick={() => window.print()} className="gap-2 bg-[#0070a0] text-white hover:bg-[#005580]">
          <Printer className="h-4 w-4" />打印 / 保存 PDF
        </Button>
      </div>

      <section className="no-print rounded-lg border border-gray-200 bg-white p-5">
        <h1 className="mb-4 text-xl font-semibold">复习卷设置</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-sm"><span>标题</span><Input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="space-y-2 text-sm"><span>排版</span><select value={columns} onChange={(e) => setColumns(Number(e.target.value) as 1 | 2)} className="h-10 w-full rounded-md border bg-white px-3"><option value={1}>单栏</option><option value={2}>双栏</option></select></label>
          <label className="space-y-2 text-sm"><span>答案</span><select value={answerMode} onChange={(e) => setAnswerMode(e.target.value as typeof answerMode)} className="h-10 w-full rounded-md border bg-white px-3"><option value="none">不显示</option><option value="end">卷尾答案</option><option value="inline">题后答案</option></select></label>
          <label className="space-y-2 text-sm"><span>答题空行</span><Input type="number" min="0" max="10" value={answerLines} onChange={(e) => setAnswerLines(Math.min(10, Math.max(0, Number(e.target.value))))} /></label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="h-4 w-4 accent-[#0070a0]" />包含原题图片</label>
        </div>
      </section>

      {selected.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-gray-500">未找到所选题目，请返回错题库重新选择。</div>
      ) : (
        <article className="worksheet-sheet mx-auto bg-white p-10 shadow-sm">
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{title || '错题复习卷'}</h1>
            <div className="mt-5 flex justify-between border-b border-gray-400 pb-2 text-sm">
              <span>姓名：________________</span><span>日期：________________</span><span>共 {selected.length} 题</span>
            </div>
          </header>
          <div className={columns === 2 ? 'worksheet-columns-2' : ''}>
            {selected.map((question, index) => (
              <section key={question.id} className="worksheet-question mb-7 break-inside-avoid">
                <div className="mb-2 flex gap-2 text-xs text-gray-500">
                  <span>{SUBJECTS.find((item) => item.id === question.subject)?.label || question.subject}</span>
                  <span>·</span><span>{question.category}</span><span>·</span>
                  <span>{DIFFICULTIES.find((item) => item.id === question.difficulty)?.label || question.difficulty}</span>
                </div>
                <p className="whitespace-pre-wrap leading-7"><strong>{index + 1}.</strong> {question.content}</p>
                {includeImages && question.image_url && <img src={question.image_url} alt={`第 ${index + 1} 题原图`} className="mt-3 max-h-72 max-w-full object-contain" />}
                {Array.from({ length: answerLines }).map((_, line) => <div key={line} className="mt-5 border-b border-dashed border-gray-300" />)}
                {answerMode === 'inline' && <Answer question={question} />}
              </section>
            ))}
          </div>
          {answerMode === 'end' && (
            <section className="worksheet-answers mt-10 break-before-page">
              <h2 className="mb-5 border-b pb-2 text-xl font-bold">参考答案与解析</h2>
              {selected.map((question, index) => <Answer key={question.id} question={question} index={index + 1} />)}
            </section>
          )}
        </article>
      )}

      <style jsx global>{`
        .worksheet-sheet { width: 210mm; min-height: 297mm; }
        .worksheet-columns-2 { column-count: 2; column-gap: 12mm; }
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; }
          nav, footer, .no-print { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .worksheet-page { display: block !important; }
          .worksheet-sheet { width: auto; min-height: auto; padding: 0 !important; box-shadow: none !important; }
          .break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  )
}

function Answer({ question, index }: { question: { answer: string; explanation: string | null }; index?: number }) {
  return (
    <div className="mt-4 break-inside-avoid rounded border border-gray-200 bg-gray-50 p-3 text-sm">
      <p><strong>{index ? `${index}. ` : ''}答案：</strong>{question.answer}</p>
      {question.explanation && <p className="mt-2 whitespace-pre-wrap text-gray-700"><strong>解析：</strong>{question.explanation}</p>}
    </div>
  )
}
