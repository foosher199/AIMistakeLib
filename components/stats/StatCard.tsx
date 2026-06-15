import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  colorClass: string
}

export function StatCard({ label, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#626a72] mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#1f1f1f]">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
