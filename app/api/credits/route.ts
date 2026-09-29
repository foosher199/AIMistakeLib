import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'

export async function GET(request: NextRequest) {
  const authResult = await getAuthClient(request)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [accountResult, redemptionResult] = await Promise.all([
    authResult.supabase
      .from('mistake_credit_accounts')
      .select('status, available_points, reserved_points, lifetime_granted, lifetime_spent')
      .eq('user_id', authResult.user.id)
      .maybeSingle(),
    authResult.supabase
      .from('mistake_invite_redemptions')
      .select('id')
      .eq('user_id', authResult.user.id)
      .maybeSingle(),
  ])

  const { data: account, error } = accountResult
  const { data: redemption, error: redemptionError } = redemptionResult

  if (error || redemptionError) {
    return NextResponse.json(
      { error: error?.message || redemptionError?.message || '获取积分账户失败' },
      { status: 500 }
    )
  }

  if (!account) {
    return NextResponse.json({
      balance: {
        status: 'active',
        availablePoints: 0,
        reservedPoints: 0,
        lifetimeGranted: 0,
        lifetimeSpent: 0,
        inviteRequired: !redemption,
      },
    })
  }

  return NextResponse.json({
    balance: {
      status: account.status,
      availablePoints: account.available_points,
      reservedPoints: account.reserved_points,
      lifetimeGranted: account.lifetime_granted,
      lifetimeSpent: account.lifetime_spent,
      inviteRequired: !redemption,
    },
  })
}
