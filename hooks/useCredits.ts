'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreditBalance } from '@/contracts/billing'

interface CreditTransaction {
  id: string
  transaction_type: 'invite_grant' | 'purchase' | 'admin_grant' | 'reserve' | 'settle' | 'release' | 'refund'
  available_delta: number
  reserved_delta: number
  available_after: number
  description: string | null
  created_at: string
}

interface ApiErrorBody {
  error?: string
  code?: string
}

async function readApiError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  return new Error(body.error || fallback)
}

export function useCredits(enabled = true) {
  return useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const response = await fetch('/api/credits')
      if (!response.ok) throw await readApiError(response, '获取积分余额失败')
      const result = (await response.json()) as { balance: CreditBalance }
      return result.balance
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useCreditTransactions(enabled = true, limit = 20) {
  return useQuery({
    queryKey: ['credit-transactions', limit],
    queryFn: async () => {
      const response = await fetch(`/api/credits/transactions?limit=${limit}`)
      if (!response.ok) throw await readApiError(response, '获取积分明细失败')
      const result = (await response.json()) as { transactions: CreditTransaction[] }
      return result.transactions
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useRedeemInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) throw await readApiError(response, '邀请码兑换失败')
      return response.json() as Promise<{
        grantedPoints: number
        availablePoints: number
      }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] })
      queryClient.invalidateQueries({ queryKey: ['credit-transactions'] })
    },
  })
}
