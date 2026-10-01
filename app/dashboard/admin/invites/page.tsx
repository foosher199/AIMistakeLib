'use client'

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Pause, Play, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Campaign {
  id: string
  name: string
  source: string
  status: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

interface InviteCode {
  id: string
  campaign_id: string | null
  code: string
  status: string
  grant_points: number
  max_redemptions: number
  redemption_count: number
  expires_at: string | null
  created_at: string
}

export default function AdminInvitesPage() {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '小红书首轮内测',
    code: '',
    grantPoints: '100',
    expiresAt: '',
  })

  const invitesQuery = useQuery({
    queryKey: ['admin-invites'],
    queryFn: async () => {
      const response = await fetch('/api/admin/invites')
      if (response.status === 403) {
        return { campaigns: [], codes: [], forbidden: true }
      }
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '加载邀请码失败')
      return {
        campaigns: result.campaigns as Campaign[],
        codes: result.codes as InviteCode[],
        forbidden: false,
      }
    },
    retry: false,
  })

  const campaigns = invitesQuery.data?.campaigns || []
  const codes = invitesQuery.data?.codes || []
  const forbidden = invitesQuery.data?.forbidden || false

  const campaignNames = new Map(
    campaigns.map((campaign) => [campaign.id, campaign.name])
  )

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const response = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        source: 'xiaohongshu',
        code: form.code.trim() || undefined,
        grantPoints: Number(form.grantPoints),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }),
    })
    const result = await response.json()
    setSaving(false)

    if (!response.ok) {
      toast.error(result.error || '创建失败')
      return
    }
    toast.success(`邀请码 ${result.code.code} 创建成功`)
    setForm((current) => ({ ...current, code: '' }))
    await invitesQuery.refetch()
  }

  const toggleStatus = async (code: InviteCode) => {
    const status = code.status === 'active' ? 'paused' : 'active'
    const response = await fetch('/api/admin/invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'code', id: code.id, status }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast.error(result.error || '更新状态失败')
      return
    }
    toast.success(status === 'active' ? '邀请码已启用' : '邀请码已暂停')
    await invitesQuery.refetch()
  }

  if (invitesQuery.isLoading) {
    return <Loader2 className="mx-auto my-20 h-9 w-9 animate-spin text-[#2563eb]" />
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-red-600" />
        <h1 className="text-xl font-semibold text-[#172033]">无管理员权限</h1>
        <p className="mt-2 text-sm text-[#64748b]">
          请将当前账户的 Supabase User ID 加入 Railway 的 ADMIN_USER_IDS。
        </p>
      </div>
    )
  }

  if (invitesQuery.isError) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {invitesQuery.error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#172033]">邀请码管理</h1>
          <p className="mt-2 text-[#64748b]">创建小红书活动邀请码并查看兑换进度。</p>
        </div>
        <Button
          variant="outline"
          onClick={() => invitesQuery.refetch()}
          disabled={invitesQuery.isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${invitesQuery.isFetching ? 'animate-spin' : ''}`} />刷新
        </Button>
      </div>

      <form onSubmit={createInvite} className="rounded-2xl border border-[#dce5ef] bg-white shadow-[0_8px_24px_rgba(30,64,100,0.10)] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#2563eb]" />
          <h2 className="text-xl font-semibold">创建活动邀请码</h2>
        </div>
        <p className="mb-5 text-sm text-[#64748b]">
          每个邀请码仅可由一个正式注册账户兑换一次。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="活动名称">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="邀请码（留空自动生成）">
            <Input value={form.code} placeholder="XHS-TEST-001" onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="每人赠送积分">
            <Input required type="number" min="1" value={form.grantPoints} onChange={(e) => setForm({ ...form, grantPoints: e.target.value })} />
          </Field>
          <Field label="过期时间（可选）">
            <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </Field>
        </div>
        <Button disabled={saving} className="mt-5">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          创建邀请码
        </Button>
      </form>

      <section className="rounded-2xl border border-[#dce5ef] bg-white shadow-[0_8px_24px_rgba(30,64,100,0.10)] p-6">
        <h2 className="mb-4 text-xl font-semibold">邀请码列表</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-[#64748b]">尚未创建邀请码</p>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => (
              <div key={code.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-[#eff6ff] p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold text-[#2563eb]">{code.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${code.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-[#f1f5f9] text-[#64748b]'}`}>
                      {code.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748b]">
                    {campaignNames.get(code.campaign_id || '') || '独立活动'} · {code.grant_points} 积分 · {code.redemption_count > 0 ? '已使用' : '未使用'}
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {code.expires_at ? `有效期至 ${new Date(code.expires_at).toLocaleString('zh-CN')}` : '长期有效'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleStatus(code)} disabled={!['active', 'paused'].includes(code.status)} className="gap-2">
                  {code.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {code.status === 'active' ? '暂停' : '启用'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-[#475569]">
      <span>{label}</span>
      {children}
    </label>
  )
}
