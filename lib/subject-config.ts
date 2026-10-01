import {
  Atom,
  BookOpenText,
  Calculator,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import type { Subject } from '@/types/database'

export interface SubjectConfig {
  name: string
  icon: LucideIcon
  color: string
}

/** Central catalog for subject names, icons, and identifying colors. */
export const SUBJECT_CONFIG: Record<Subject, SubjectConfig> = {
  math: { name: '数学', icon: Calculator, color: '#2563eb' },
  chinese: { name: '语文', icon: BookOpenText, color: '#e11d48' },
  english: { name: '英语', icon: Languages, color: '#0284c7' },
  physics: { name: '物理', icon: Atom, color: '#0891b2' },
  chemistry: { name: '化学', icon: FlaskConical, color: '#0f766e' },
  biology: { name: '生物', icon: Dna, color: '#16a34a' },
  history: { name: '历史', icon: ScrollText, color: '#d97706' },
  geography: { name: '地理', icon: Globe2, color: '#0e7490' },
  politics: { name: '政治', icon: Landmark, color: '#be185d' },
}
