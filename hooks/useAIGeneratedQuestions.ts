'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AIGeneratedQuestion } from '@/types/database'
import { toast } from 'sonner'

interface AIGeneratedQuestionsResponse {
  variations: AIGeneratedQuestion[]
}

interface CollectVariationResponse {
  question: {
    id: string
    content: string
  }
}

/**
 * 获取某道错题的 AI 生成变式题列表
 */
export function useAIGeneratedQuestions(sourceQuestionId: string | null) {
  return useQuery({
    queryKey: ['ai-generated-questions', sourceQuestionId],
    queryFn: async () => {
      if (!sourceQuestionId) throw new Error('错题 ID 不能为空')

      const response = await fetch(
        `/api/ai-generated?sourceQuestionId=${sourceQuestionId}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取变式题失败')
      }

      const data: AIGeneratedQuestionsResponse = await response.json()
      return data.variations
    },
    enabled: !!sourceQuestionId,
  })
}

/**
 * 收藏 AI 生成题目为正式错题
 */
export function useCollectVariation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ai-generated/${id}/collect`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '收藏失败')
      }

      const result: CollectVariationResponse = await response.json()
      return result.question
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      toast.success('已收藏到错题本！')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * 删除 AI 生成题目
 */
export function useDeleteVariation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ai-generated/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除失败')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ai-generated-questions'],
      })
      toast.success('已删除')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * 对 AI 生成题目反馈合理/不合理
 */
export function useFeedbackVariation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: 'valid' | 'invalid'
    }) => {
      const response = await fetch(`/api/ai-generated/${id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '反馈提交失败')
      }

      const result: { generatedQuestion: AIGeneratedQuestion } = await response.json()
      return result.generatedQuestion
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ai-generated-questions'],
      })
      toast.success(variables.status === 'valid' ? '已标记为合理' : '已反馈不合理')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
