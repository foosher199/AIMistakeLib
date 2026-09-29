import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'

export async function GET(request: NextRequest) {
  const authResult = await getAuthClient(request)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: account, error } = await authResult.supabase
    .from('mistake_credit_accounts')
    .select('status, available_points, reserved_points, lifetime_granted, lifetime_spent')
    .eq('user_id', authResult.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!account) {
    return NextResponse.json({
      balance: {
        status: 'active',
        availablePoints: 0,
        reservedPoints: 0,
        lifetimeGranted: 0,
        lifetimeSpent: 0,
        inviteRequired: true,
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
      inviteRequired: false,
    },
  })
}
