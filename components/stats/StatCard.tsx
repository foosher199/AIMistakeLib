import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  colorClass: string
}

export function StatCard({ label, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <div className="rounded-[22px] border border-[#dce8f3] bg-white p-5 shadow-[0_10px_28px_rgba(58,108,150,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(58,108,150,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#64748b] mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#172b4d]">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
