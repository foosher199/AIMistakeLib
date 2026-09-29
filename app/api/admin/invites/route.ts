import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminContext } from '@/server/admin'

const CreateInviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  source: z.string().trim().min(2).max(50).default('xiaohongshu'),
  code: z.string().trim().min(4).max(64).optional(),
  grantPoints: z.number().int().min(1).max(1_000_000),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

const UpdateStatusSchema = z.object({
  entity: z.enum(['campaign', 'code']),
  id: z.string().uuid(),
  status: z.enum(['active', 'paused']),
})

function generateCode() {
  return `XHS-${randomBytes(5).toString('hex').toUpperCase()}`
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: campaigns, error: campaignError } = await context.admin
    .from('mistake_invite_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  const { data: codes, error: codeError } = await context.admin
    .from('mistake_invite_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (campaignError || codeError) {
    return NextResponse.json(
      { error: campaignError?.message || codeError?.message || '加载失败' },
      { status: 500 }
    )
  }

  return NextResponse.json({ campaigns: campaigns || [], codes: codes || [] })
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const validation = CreateInviteSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return NextResponse.json({ error: '请检查活动和邀请码参数' }, { status: 400 })
  }

  const input = validation.data
  const code = (input.code || generateCode()).toUpperCase()
  const { data: campaign, error: campaignError } = await context.admin
    .from('mistake_invite_campaigns')
    .insert({
      name: input.name,
      source: input.source,
      status: 'active',
      starts_at: input.startsAt || null,
      ends_at: input.expiresAt || null,
      metadata: { created_by: context.user.id },
    })
    .select('*')
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message || '创建活动失败' }, { status: 500 })
  }

  const { data: inviteCode, error: codeError } = await context.admin
    .from('mistake_invite_codes')
    .insert({
      campaign_id: campaign.id,
      code,
      status: 'active',
      grant_points: input.grantPoints,
      max_redemptions: 1,
      expires_at: input.expiresAt || null,
      metadata: {},
    })
    .select('*')
    .single()

  if (codeError || !inviteCode) {
    await context.admin.from('mistake_invite_campaigns').delete().eq('id', campaign.id)
    const status = codeError?.code === '23505' ? 409 : 500
    return NextResponse.json(
      { error: status === 409 ? '邀请码已存在' : codeError?.message || '创建邀请码失败' },
      { status }
    )
  }

  return NextResponse.json({ campaign, code: inviteCode }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const validation = UpdateStatusSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) return NextResponse.json({ error: '状态参数无效' }, { status: 400 })

  const input = validation.data
  const updatedAt = new Date().toISOString()
  const { error } = input.entity === 'campaign'
    ? await context.admin
        .from('mistake_invite_campaigns')
        .update({ status: input.status, updated_at: updatedAt })
        .eq('id', input.id)
    : await context.admin
        .from('mistake_invite_codes')
        .update({ status: input.status, updated_at: updatedAt })
        .eq('id', input.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
