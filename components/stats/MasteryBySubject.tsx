import type { Subject } from '@/types/database'

interface SubjectStat {
  id: Subject
  name: string
  total: number
  mastered: number
  rate: number
}

interface MasteryBySubjectProps {
  subjects: SubjectStat[]
}

const subjectColors: Record<Subject, string> = {
  math: '#3b82f6',
  chinese: '#ef4444',
  english: '#0ea5e9',
  physics: '#06b6d4',
  chemistry: '#f59e0b',
  biology: '#0f766e',
  history: '#f97316',
  geography: '#84cc16',
  politics: '#ec4899',
}

export function MasteryBySubject({ subjects }: MasteryBySubjectProps) {
  if (subjects.length === 0) {
    return <p className="text-sm text-[#64748b]">暂无学科数据</p>
  }

  const maxTotal = Math.max(...subjects.map((s) => s.total), 1)

  return (
    <div className="space-y-4">
      {subjects.map((subject) => {
        const color = subjectColors[subject.id]
        const totalWidth = (subject.total / maxTotal) * 100
        const masteryWidth = subject.total > 0 ? (subject.mastered / subject.total) * 100 : 0

        return (
          <div key={subject.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-[#172b4d]">{subject.name}</span>
              <span className="text-xs text-[#64748b]">
                {subject.mastered}/{subject.total} 掌握 {subject.rate}%
              </span>
            </div>
            <div className="h-2.5 bg-[#edf4fa] rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500 absolute left-0 top-0 opacity-30"
                style={{ width: `${totalWidth}%`, backgroundColor: color }}
              />
              <div
                className="h-full rounded-full transition-all duration-500 absolute left-0 top-0"
                style={{ width: `${(totalWidth * masteryWidth) / 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
