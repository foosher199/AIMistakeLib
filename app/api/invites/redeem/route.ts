import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthClient } from '@/server/supabase'

const RedeemInviteSchema = z.object({
  code: z.string().trim().min(4).max(64),
})

const inviteMessages: Record<string, string> = {
  INVITE_ALREADY_REDEEMED: '当前账户已经兑换过邀请码',
  INVITE_INVALID: '邀请码不存在',
  INVITE_INACTIVE: '邀请码暂不可用',
  INVITE_CAMPAIGN_INACTIVE: '该邀请活动暂不可用',
  INVITE_EXPIRED: '邀请码已过期',
  INVITE_EXHAUSTED: '邀请码使用次数已达上限',
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthClient(request)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = RedeemInviteSchema.safeParse(await request.json())
  if (!validation.success) {
    return NextResponse.json({ error: '请输入有效的邀请码' }, { status: 400 })
  }

  const { data, error } = await authResult.supabase.rpc('redeem_invite_code', {
    p_code: validation.data.code,
  })

  if (error) {
    const matchedCode = Object.keys(inviteMessages).find((code) =>
      error.message.includes(code)
    )
    return NextResponse.json(
      {
        error: matchedCode ? inviteMessages[matchedCode] : '邀请码兑换失败',
        code: matchedCode || 'INVITE_REDEEM_FAILED',
      },
      { status: matchedCode === 'INVITE_ALREADY_REDEEMED' ? 409 : 400 }
    )
  }

  const redemption = data?.[0]
  return NextResponse.json({
    grantedPoints: redemption?.granted_points || 0,
    availablePoints: redemption?.available_points || 0,
  })
}
