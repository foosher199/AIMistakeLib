import { NextRequest, NextResponse } from 'next/server'
import { getAuthClient } from '@/server/supabase'

export async function GET(request: NextRequest) {
  const authResult = await getAuthClient(request)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 20

  const { data, error } = await authResult.supabase
    .from('mistake_credit_transactions')
    .select('id, transaction_type, available_delta, reserved_delta, available_after, description, created_at')
    .eq('user_id', authResult.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ transactions: data || [] })
}
