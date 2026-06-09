'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Draft } from '@/types/database'
import { toast } from 'sonner'

interface DraftsResponse {
  drafts: Draft[]
}

/**
 * 获取当前用户的草稿列表
 */
export function useDrafts() {
  return useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const response = await fetch('/api/drafts')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取草稿列表失败')
      }

      const data: DraftsResponse = await response.json()
      return data.drafts
    },
    staleTime: 1000 * 60, // 1分钟内数据保持新鲜
  })
}

/**
 * 保存草稿到正式错题表
 */
export function useSaveDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (draftId: string) => {
      const response = await fetch(`/api/drafts/${draftId}/save`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '保存草稿失败')
      }

      return response.json()
    },
    onSuccess: () => {
      // 使草稿列表和题目列表失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      toast.success('题目保存成功！')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * 删除草稿
 */
export function useDeleteDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (draftId: string) => {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除草稿失败')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success('已删除')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
