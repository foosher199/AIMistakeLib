'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { normalizeWorksheetTitle } from '@/lib/worksheet-title'

interface WorksheetListItem {
  id: string
  title: string
  questionCount: number
  updated_at: string
}

export default function WorksheetsPage() {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()
  const pageSize = 12
  const query = useQuery({
    queryKey: ['worksheets', page],
    queryFn: async () => {
      const response = await fetch(`/api/worksheets?limit=${pageSize}&offset=${page * pageSize}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '加载练习卷失败')
      return data as { worksheets: WorksheetListItem[]; total: number }
    },
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/worksheets/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除练习卷失败')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })
      toast.success('练习卷已删除')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">练习卷</h1>
          <p className="mt-2 text-[#64748b]">创建练习卷，或重新打开、调整并打印已保存的练习卷。</p>
        </div>
        <Button asChild variant="jelly" className="gap-2 rounded-full px-6">
          <Link href="/dashboard/questions?mode=worksheet">
            <Plus className="h-4 w-4" />
            创建练习卷
          </Link>
        </Button>
      </div>
      {query.isLoading ? <Loader2 className="mx-auto my-20 h-9 w-9 animate-spin text-[#3b82f6]" /> : query.error ? (
        <div className="rounded border border-red-200 bg-red-50 p-5 text-red-600">{query.error.message}</div>
      ) : query.data?.worksheets.length === 0 ? (
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-12 text-center shadow-[0_8px_24px_rgba(30,64,100,0.07)]">
          <FileText className="mx-auto mb-3 h-10 w-10 text-[#94a3b8]" />
          <p className="text-[#64748b]">还没有保存练习卷</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/questions?mode=worksheet">选择题目并创建</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {query.data?.worksheets.map((worksheet) => (
            <div key={worksheet.id} className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-[0_8px_24px_rgba(30,64,100,0.07)]">
              <h2 className="truncate text-lg font-semibold">
                {normalizeWorksheetTitle(worksheet.title)}
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">{worksheet.questionCount} 道题 · {formatDateTime(worksheet.updated_at)}</p>
              <div className="mt-5 flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/dashboard/worksheets/${worksheet.id}`}>打开</Link>
                </Button>
                <Button variant="ghost" disabled={remove.isPending} onClick={() => confirm('确定删除这份练习卷吗？') && remove.mutate(worksheet.id)} className="text-[#f43f5e]"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(query.data?.total || 0) > pageSize && (
        <div className="flex justify-center gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>上一页</Button><span className="py-2 text-sm">第 {page + 1} 页</span><Button variant="outline" disabled={(page + 1) * pageSize >= (query.data?.total || 0)} onClick={() => setPage((value) => value + 1)}>下一页</Button></div>
      )}
    </div>
  )
}
