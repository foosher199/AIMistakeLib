import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other'
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed'

export interface Feedback {
  id: string
  user_id: string | null
  email: string | null
  category: FeedbackCategory
  subject: string
  content: string
  status: FeedbackStatus
  created_at: string
  updated_at: string
}

export interface CreateFeedbackInput {
  category: FeedbackCategory
  subject: string
  content: string
  email?: string
}

export function useCreateFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateFeedbackInput) => {
      const response = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '提交反馈失败')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      toast.success('反馈提交成功，感谢您的支持！')
    },
    onError: (error: Error) => {
      toast.error(error.message || '提交反馈失败')
    },
  })
}

export function useFeedbacks() {
  return useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const response = await fetch('/api/feedbacks')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '获取反馈列表失败')
      }

      const { data } = await response.json()
      return data as Feedback[]
    },
  })
}
