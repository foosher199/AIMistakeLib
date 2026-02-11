'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Question, QuestionInsert, QuestionUpdate } from '@/types/database'
import { toast } from 'sonner'

// 查询参数类型
interface QuestionsQueryParams {
  subject?: string
  difficulty?: string
  is_mastered?: boolean
  search?: string
  limit?: number
  offset?: number
}

// API 响应类型
interface QuestionsResponse {
  questions: Question[]
  total: number
}

interface QuestionResponse {
  question: Question
}

interface StatsResponse {
  stats: {
    total: number
    mastered: number
    pending: number
  }
}

/**
 * 获取题目列表
 */
export function useQuestions(params: QuestionsQueryParams = {}) {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: async () => {
      // 构建查询参数
      const searchParams = new URLSearchParams()

      if (params.subject) searchParams.append('subject', params.subject)
      if (params.difficulty) searchParams.append('difficulty', params.difficulty)
      if (params.is_mastered !== undefined)
        searchParams.append('is_mastered', String(params.is_mastered))
      if (params.search) searchParams.append('search', params.search)
      if (params.limit) searchParams.append('limit', String(params.limit))
      if (params.offset) searchParams.append('offset', String(params.offset))

      const response = await fetch(`/api/questions?${searchParams.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取题目列表失败')
      }

      const data: QuestionsResponse = await response.json()
      return data
    },
    staleTime: 1000 * 60 * 5, // 5分钟内数据保持新鲜
  })
}

/**
 * 获取单个题目详情
 */
export function useQuestion(id: string | null) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: async () => {
      if (!id) throw new Error('题目 ID 不能为空')

      const response = await fetch(`/api/questions/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取题目详情失败')
      }

      const data: QuestionResponse = await response.json()
      return data.question
    },
    enabled: !!id, // 只有当 id 存在时才执行查询
  })
}

/**
 * 获取统计信息
 */
export function useQuestionStats() {
  return useQuery({
    queryKey: ['question-stats'],
    queryFn: async () => {
      const response = await fetch('/api/questions/stats')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取统计信息失败')
      }

      const data: StatsResponse = await response.json()
      return data.stats
    },
    staleTime: 1000 * 60, // 1分钟内数据保持新鲜
  })
}

/**
 * 创建新题目
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: QuestionInsert) => {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '创建题目失败')
      }

      const result: QuestionResponse = await response.json()
      return result.question
    },
    onSuccess: () => {
      // 使所有相关查询失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      toast.success('题目创建成功！')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * 更新题目
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: QuestionUpdate
    }) => {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新题目失败')
      }

      const result: QuestionResponse = await response.json()
      return result.question
    },
    onMutate: async ({ id, data }) => {
      // 取消正在进行的查询，避免覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: ['question', id] })

      // 保存之前的数据（用于回滚）
      const previousQuestion = queryClient.getQueryData<Question>(['question', id])

      // 乐观更新：立即更新本地缓存
      if (previousQuestion) {
        queryClient.setQueryData<Question>(['question', id], {
          ...previousQuestion,
          ...data,
        })
      }

      return { previousQuestion }
    },
    onError: (error: Error, variables, context) => {
      // 回滚到之前的数据
      if (context?.previousQuestion) {
        queryClient.setQueryData(['question', variables.id], context.previousQuestion)
      }
      toast.error(error.message)
    },
    onSuccess: (data) => {
      // 更新缓存
      queryClient.setQueryData(['question', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      toast.success('题目更新成功！')
    },
  })
}

/**
 * 删除题目
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除题目失败')
      }

      return id
    },
    onSuccess: (id) => {
      // 移除该题目的缓存
      queryClient.removeQueries({ queryKey: ['question', id] })
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      toast.success('题目删除成功！')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * 记录复习
 */
export function useReviewQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/questions/${id}/review`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '记录复习失败')
      }

      const result: QuestionResponse = await response.json()
      return result.question
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['question', id] })

      const previousQuestion = queryClient.getQueryData<Question>(['question', id])

      // 乐观更新：review_count + 1
      if (previousQuestion) {
        queryClient.setQueryData<Question>(['question', id], {
          ...previousQuestion,
          review_count: previousQuestion.review_count + 1,
          last_reviewed: new Date().toISOString(),
        })
      }

      return { previousQuestion }
    },
    onError: (error: Error, id, context) => {
      if (context?.previousQuestion) {
        queryClient.setQueryData(['question', id], context.previousQuestion)
      }
      toast.error(error.message)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['question', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      toast.success('复习记录已更新！')
    },
  })
}

/**
 * 标记为已掌握
 */
export function useMasterQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/questions/${id}/master`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '标记掌握失败')
      }

      const result: QuestionResponse = await response.json()
      return result.question
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['question', id] })

      const previousQuestion = queryClient.getQueryData<Question>(['question', id])

      // 乐观更新：is_mastered = true
      if (previousQuestion) {
        queryClient.setQueryData<Question>(['question', id], {
          ...previousQuestion,
          is_mastered: true,
        })
      }

      return { previousQuestion }
    },
    onError: (error: Error, id, context) => {
      if (context?.previousQuestion) {
        queryClient.setQueryData(['question', id], context.previousQuestion)
      }
      toast.error(error.message)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['question', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      queryClient.invalidateQueries({ queryKey: ['question-stats'] })
      toast.success('已标记为掌握！')
    },
  })
}
