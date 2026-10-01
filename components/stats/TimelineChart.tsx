interface TimelineData {
  date: string
  count: number
}

interface TimelineChartProps {
  data: TimelineData[]
  maxCount: number
}

export function TimelineChart({ data, maxCount }: TimelineChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-[#64748b]">暂无数据</p>
  }

  return (
    <div className="h-48 flex items-end justify-between gap-1">
      {data.map((item, index) => {
        const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
        const isLastSevenDays = index >= data.length - 7

        return (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex items-end justify-center h-32">
              <div
                className={`w-full max-w-[20px] rounded-t transition-all duration-500 ${
                  isLastSevenDays ? 'bg-[#3b82f6]' : 'bg-[#eff6ff]'
                }`}
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${item.date}: ${item.count} 道`}
              />
            </div>
            {index % 5 === 4 && (
              <span className="text-[10px] text-[#64748b] truncate w-full text-center">
                {item.date}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
