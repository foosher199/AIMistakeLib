import type { LucideProps } from 'lucide-react'
import { SUBJECT_CONFIG } from '@/lib/subject-config'
import type { Subject } from '@/types/database'

interface SubjectIconProps extends LucideProps {
  subject: Subject
}

export function SubjectIcon({ subject, ...props }: SubjectIconProps) {
  const Icon = SUBJECT_CONFIG[subject].icon

  return <Icon aria-hidden="true" strokeWidth={2} {...props} />
}
