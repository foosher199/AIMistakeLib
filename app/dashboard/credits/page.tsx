'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Loader2, Ticket, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import {
  useCredits,
  useCreditTransactions,
  useRedeemInvite,
} from '@/hooks/useCredits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const transactionNames: Record<string, string> = {
  invite_grant: '邀请码赠送',
  purchase: '购买积分',
  admin_grant: '平台赠送',
  reserve: 'AI 调用预冻结',
  settle: 'AI 调用结算',
  release: '失败退回',
  refund: '积分退款',
}

export default function CreditsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [inviteCode, setInviteCode] = useState('')
  const credits = useCredits(Boolean(user))
  const transactions = useCreditTransactions(Boolean(user))
  const redeemInvite = useRedeemInvite()

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [loading, router, user])

  const handleRedeem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = inviteCode.trim()
    if (!code) return

    try {
      const result = await redeemInvite.mutateAsync(code)
      setInviteCode('')
      toast.success(`兑换成功，已获得 ${result.grantedPoints} 积分`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '邀请码兑换失败')
    }
  }

  if (loading || !user || credits.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-9 w-9 animate-spin text-[#0070a0]" />
      </div>
    )
  }

  const balance = credits.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">积分中心</h1>
        <p className="mt-2 text-gray-600">查看 AI 调用积分，并兑换试用邀请码。</p>
      </div>

      {credits.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {credits.error.message}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Coins} label="可用积分" value={balance?.availablePoints || 0} />
          <StatCard icon={WalletCards} label="累计获得" value={balance?.lifetimeGranted || 0} />
          <StatCard icon={WalletCards} label="累计消耗" value={balance?.lifetimeSpent || 0} />
        </div>
      )}

      {balance?.inviteRequired && (
        <section className="rounded-lg border border-[#b9dce9] bg-white p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-full bg-[#e5f3f8] p-2 text-[#0070a0]">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">兑换试用邀请码</h2>
              <p className="mt-1 text-sm text-gray-600">
                输入从小红书活动获得的邀请码。每个账户只能兑换一次。
              </p>
            </div>
          </div>
          <form onSubmit={handleRedeem} className="flex max-w-lg flex-col gap-3 sm:flex-row">
            <Input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="请输入邀请码"
              maxLength={64}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!inviteCode.trim() || redeemInvite.isPending}
              className="bg-[#0070a0] text-white hover:bg-[#005580]"
            >
              {redeemInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              立即兑换
            </Button>
          </form>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">积分明细</h2>
        {transactions.isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#0070a0]" />
        ) : transactions.isError ? (
          <p className="text-sm text-red-600">{transactions.error.message}</p>
        ) : transactions.data?.length ? (
          <div className="divide-y divide-gray-100">
            {transactions.data.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.description || transactionNames[transaction.transaction_type] || '积分变动'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.available_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.available_delta > 0 ? '+' : ''}{transaction.available_delta}
                  </p>
                  <p className="text-xs text-gray-500">余额 {transaction.available_after}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">暂无积分记录</p>
        )}
      </section>

      <p className="text-sm text-gray-500">
        图片识别、错因分析和举一反三会根据模型实际用量结算；失败的模型调用会自动退回预冻结积分。
      </p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3 text-gray-600">
        <Icon className="h-5 w-5 text-[#0070a0]" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value.toLocaleString('zh-CN')}</p>
    </div>
  )
}
