'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import type { WorksheetSettings } from './WorksheetBuilder'
import { WorksheetBuilder } from './WorksheetBuilder'

export function SavedWorksheetLoader({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['worksheet', id],
    queryFn: async () => {
      const response = await fetch(`/api/worksheets/${id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '加载练习卷失败')
      return data.worksheet as { id: string; title: string; settings: WorksheetSettings; questionIds: string[]; updated_at: string }
    },
  })
  if (query.isLoading) return <Loader2 className="mx-auto my-20 h-9 w-9 animate-spin text-[#0070a0]" />
  if (query.error || !query.data) return <div className="rounded border bg-white p-10 text-center text-red-500">{query.error?.message || '练习卷不存在'}</div>
  return <WorksheetBuilder key={query.data.updated_at} worksheetId={id} questionIds={query.data.questionIds} initialTitle={query.data.title} initialSettings={query.data.settings} />
}
