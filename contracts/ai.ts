import type { Difficulty, Subject } from '@/types/database'

/** Public result returned by the image-recognition API. */
export interface AIRecognitionResult {
  content: string
  subject: Subject
  category: string
  difficulty: Difficulty
  answer: string
  explanation?: string
  confidence?: number
}
