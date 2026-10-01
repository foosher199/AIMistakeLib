interface DistributionBarProps {
  label: string
  count: number
  total: number
  color: string
  showPercentage?: boolean
}

export function DistributionBar({ label, count, total, color, showPercentage = true }: DistributionBarProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[#172b4d]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#172b4d]">{count}</span>
          {showPercentage && (
            <span className="text-xs text-[#64748b] w-10 text-right">{percentage}%</span>
          )}
        </div>
      </div>
      <div className="h-2 bg-[#f7faff] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
