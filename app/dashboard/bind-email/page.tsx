'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { BindEmailForm } from '@/components/auth/BindEmailForm'
import { useAuth } from '@/hooks/useAuth'

export default function BindEmailPage() {
  const router = useRouter()
  const { user, loading, isAnonymous } = useAuth()

  useEffect(() => {
    if (!loading && user && !isAnonymous) {
      router.replace('/dashboard/credits')
    }
  }, [isAnonymous, loading, router, user])

  if (loading || !user || !isAnonymous) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-9 w-9 animate-spin text-[#3b82f6]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[#3b82f6]">
          <Mail className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-bold text-[#172b4d]">注册正式账户</h1>
        <p className="mt-2 text-[#64748b]">
          绑定邮箱并设置密码后，即可兑换一次性邀请码，同时保留当前游客账户的数据。
        </p>
      </div>

      <div className="rounded-2xl border border-[#dce7f5] bg-white shadow-[0_8px_24px_rgba(30,64,100,0.07)] p-6">
        <BindEmailForm onSuccess={() => router.replace('/dashboard/credits')} />
      </div>
    </div>
  )
}
