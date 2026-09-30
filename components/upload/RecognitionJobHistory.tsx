'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatDistanceToNow } from '@/lib/utils'

interface RecognitionJob {
  id: string
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
  progress: number
  mode: string
  attempt_count: number
  max_attempts: number
  error_message: string | null
  created_at: string
}

export function RecognitionJobHistory() {
  const queryClient = useQueryClient()
  const completedRef = useRef('')
  const query = useQuery({
    queryKey: ['recognition-jobs'],
    queryFn: async () => {
      const response = await fetch('/api/ai/recognition-jobs?limit=10', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '加载识别任务失败')
      return data.jobs as RecognitionJob[]
    },
    refetchInterval: (state) => state.state.data?.some((job) => job.status === 'queued' || job.status === 'processing') ? 2000 : false,
  })
  useEffect(() => {
    const completed = (query.data || []).filter((job) => job.status === 'succeeded').map((job) => job.id).join(',')
    if (completed && completed !== completedRef.current) {
      completedRef.current = completed
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    }
  }, [query.data, queryClient])

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ai/recognition-jobs/${id}/retry`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '任务重试失败')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognition-jobs'] })
      toast.success('任务已重新提交')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!query.data?.length) return null
  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">最近识别任务</h2>
      <div className="space-y-3">
        {query.data.map((job) => {
          const active = job.status === 'queued' || job.status === 'processing'
          const icon = active ? <Loader2 className="h-4 w-4 animate-spin text-[#0070a0]" /> : job.status === 'succeeded' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : job.status === 'failed' ? <XCircle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-gray-500" />
          return (
            <div key={job.id} className="rounded border p-3">
              <div className="flex items-center gap-2 text-sm">
                {icon}<span className="font-medium">{modeLabel(job.mode)}</span><span className="text-gray-500">{statusLabel(job.status)}</span><span className="ml-auto text-xs text-gray-500">{formatDistanceToNow(job.created_at)}</span>
                {job.status === 'failed' && job.attempt_count < job.max_attempts && <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(job.id)} className="gap-1"><RefreshCw className="h-3 w-3" />重试</Button>}
              </div>
              {active && <Progress value={Math.max(5, job.progress)} className="mt-2 h-1.5" />}
              {job.error_message && <p className="mt-2 text-xs text-red-500">{job.error_message}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function modeLabel(mode: string) {
  return { vision: '阿里图片识别', text: 'OCR 文本识别', baidu_understanding: '百度图片理解', baidu_paper_cut: '百度试卷切题' }[mode] || mode
}

function statusLabel(status: RecognitionJob['status']) {
  return { queued: '等待执行', processing: '识别中', succeeded: '已完成', failed: '失败', cancelled: '已取消' }[status]
}
