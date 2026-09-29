export type UsageJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: UsageJson | undefined }
  | UsageJson[]

export interface ModelUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  imageCount?: number
  requestCount?: number
  providerRequestId?: string
  raw?: UsageJson
}

export interface MeteredAIResult<T> {
  data: T
  provider: string
  model: string
  usage: ModelUsage
}

export interface BillingSummary {
  pointsCharged: number
  pointsRemaining: number
}

export interface CreditBalance {
  status: 'active' | 'frozen' | 'closed'
  availablePoints: number
  reservedPoints: number
  lifetimeGranted: number
  lifetimeSpent: number
  inviteRequired: boolean
}
