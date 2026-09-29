import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { BillingSummary, MeteredAIResult } from '@/contracts/billing'

interface BillableOperation {
  operation: string
  provider: string
  model: string
  idempotencyKey?: string
}

interface ReserveResult {
  usage_id: string
  reserved_points: number
  available_points: number
}

interface SettleResult {
  charged_points: number
  available_points: number
}

export class BillingError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'BillingError'
    this.code = code
    this.status = status
  }
}

function mapBillingError(message: string): BillingError {
  if (message.includes('INVITE_REQUIRED')) {
    return new BillingError('INVITE_REQUIRED', '请先兑换邀请码领取试用积分', 403)
  }
  if (message.includes('INSUFFICIENT_CREDITS')) {
    return new BillingError('INSUFFICIENT_CREDITS', '积分不足，无法执行本次 AI 操作', 402)
  }
  if (message.includes('CREDIT_ACCOUNT_INACTIVE')) {
    return new BillingError('CREDIT_ACCOUNT_INACTIVE', '积分账户当前不可用', 403)
  }
  if (message.includes('PRICING_NOT_CONFIGURED')) {
    return new BillingError('PRICING_NOT_CONFIGURED', '该模型尚未配置积分价格', 503)
  }
  return new BillingError('BILLING_ERROR', '积分结算失败，请稍后重试', 500)
}

export async function executeMeteredOperation<T>(
  supabase: SupabaseClient<Database>,
  operation: BillableOperation,
  execute: () => Promise<MeteredAIResult<T>>
): Promise<{ data: T; billing: BillingSummary }> {
  const idempotencyKey = (operation.idempotencyKey || randomUUID()).slice(0, 128)
  const { data: reservedRows, error: reserveError } = await supabase.rpc(
    'reserve_ai_credits',
    {
      p_operation: operation.operation,
      p_provider: operation.provider,
      p_model: operation.model,
      p_idempotency_key: idempotencyKey,
    }
  )

  if (reserveError) throw mapBillingError(reserveError.message)

  const reservation = (reservedRows?.[0] || null) as ReserveResult | null
  if (!reservation) {
    throw new BillingError('BILLING_ERROR', '未能创建积分预授权', 500)
  }

  try {
    const result = await execute()
    const usage = result.usage
    const { data: settledRows, error: settleError } = await supabase.rpc(
      'settle_ai_credits',
      {
        p_usage_id: reservation.usage_id,
        p_input_tokens: usage.inputTokens || 0,
        p_output_tokens: usage.outputTokens || 0,
        p_total_tokens: usage.totalTokens || 0,
        p_image_count: usage.imageCount || 0,
        p_request_count: usage.requestCount ?? 1,
        p_provider_request_id: usage.providerRequestId || null,
        p_raw_usage: usage.raw || {},
      }
    )

    if (settleError) throw mapBillingError(settleError.message)

    const settlement = (settledRows?.[0] || null) as SettleResult | null
    if (!settlement) {
      throw new BillingError('BILLING_ERROR', '模型调用成功，但积分结算未完成', 500)
    }

    return {
      data: result.data,
      billing: {
        pointsCharged: settlement.charged_points,
        pointsRemaining: settlement.available_points,
      },
    }
  } catch (error) {
    await supabase.rpc('release_ai_credits', {
      p_usage_id: reservation.usage_id,
      p_error_code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
    })
    throw error
  }
}

export function billingErrorResponse(error: unknown): {
  error: string
  code?: string
  status: number
} {
  if (error instanceof BillingError) {
    return { error: error.message, code: error.code, status: error.status }
  }
  return {
    error: error instanceof Error ? error.message : 'AI 操作失败，请稍后重试',
    status: 500,
  }
}
