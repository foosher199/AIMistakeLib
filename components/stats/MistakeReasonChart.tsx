import { MISTAKE_REASONS } from '@/types/database'

interface MistakeReason {
  reason: string
  count: number
  percentage: number
}

interface MistakeReasonChartProps {
  reasons: MistakeReason[]
}

export function MistakeReasonChart({ reasons }: MistakeReasonChartProps) {
  const reasonColorMap = new Map(MISTAKE_REASONS.map((r) => [r.id, r.color]))

  if (reasons.length === 0) {
    return <p className="text-sm text-[#625f77]">还没有错因分析数据，快去使用 AI 错因分析吧</p>
  }

  return (
    <div className="space-y-3">
      {reasons.map((item) => {
        const color = reasonColorMap.get(item.reason) || '#5b55d6'

        return (
          <div key={item.reason}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#29264a]">{item.reason}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#29264a]">{item.count} 次</span>
                <span className="text-xs text-[#625f77] w-10 text-right">{item.percentage}%</span>
              </div>
            </div>
            <div className="h-2 bg-[#fff9f1] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
