import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  colorClass: string
}

export function StatCard({ label, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e4def5]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#625f77] mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#29264a]">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
