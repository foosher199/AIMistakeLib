/**
 * Supabase Database Types
 *
 * 说明：本文件定义了 Supabase 数据库的完整 TypeScript 类型
 * 可以使用 Supabase CLI 自动生成：
 * npx supabase gen types typescript --project-id <your-project-id> > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * 数据库 Schema 定义
 */
export interface Database {
  public: {
    Tables: {
      /**
       * 用户扩展信息表
       */
      mistake_profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mistake_profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 错题记录表
       */
      mistake_questions: {
        Row: {
          id: string
          content: string
          subject: string
          category: string
          difficulty: 'easy' | 'medium' | 'hard'
          answer: string
          user_answer: string | null
          explanation: string | null
          image_url: string | null
          review_count: number
          is_mastered: boolean
          last_reviewed: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          content: string
          subject: string
          category: string
          difficulty: 'easy' | 'medium' | 'hard'
          answer: string
          user_answer?: string | null
          explanation?: string | null
          image_url?: string | null
          review_count?: number
          is_mastered?: boolean
          last_reviewed?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          content?: string
          subject?: string
          category?: string
          difficulty?: 'easy' | 'medium' | 'hard'
          answer?: string
          user_answer?: string | null
          explanation?: string | null
          image_url?: string | null
          review_count?: number
          is_mastered?: boolean
          last_reviewed?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mistake_questions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

/**
 * 便捷类型别名
 */

// 用户扩展信息类型
export type Profile = Database['public']['Tables']['mistake_profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['mistake_profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['mistake_profiles']['Update']

// 错题记录类型
export type Question = Database['public']['Tables']['mistake_questions']['Row']
export type QuestionInsert = Database['public']['Tables']['mistake_questions']['Insert']
export type QuestionUpdate = Database['public']['Tables']['mistake_questions']['Update']

// 难度枚举
export type Difficulty = 'easy' | 'medium' | 'hard'

// 学科枚举（9个学科）
export type Subject =
  | 'math'        // 数学
  | 'chinese'     // 语文
  | 'english'     // 英语
  | 'physics'     // 物理
  | 'chemistry'   // 化学
  | 'biology'     // 生物
  | 'history'     // 历史
  | 'geography'   // 地理
  | 'politics'    // 政治

/**
 * 学科配置
 */
export const SUBJECTS: { id: Subject; label: string }[] = [
  { id: 'math', label: '数学' },
  { id: 'chinese', label: '语文' },
  { id: 'english', label: '英语' },
  { id: 'physics', label: '物理' },
  { id: 'chemistry', label: '化学' },
  { id: 'biology', label: '生物' },
  { id: 'history', label: '历史' },
  { id: 'geography', label: '地理' },
  { id: 'politics', label: '政治' },
]

/**
 * 难度配置
 */
export const DIFFICULTIES: { id: Difficulty; label: string; color: string }[] = [
  { id: 'easy', label: '简单', color: 'green' },
  { id: 'medium', label: '中等', color: 'yellow' },
  { id: 'hard', label: '困难', color: 'red' },
]

/**
 * 学科对应的知识点分类
 */
export const CATEGORIES: Record<Subject, string[]> = {
  math: ['代数', '几何', '函数', '概率统计', '数列', '三角函数', '解析几何'],
  chinese: ['阅读理解', '作文', '古诗文', '语言文字运用', '文学常识'],
  english: ['阅读理解', '完形填空', '语法', '写作', '听力', '词汇'],
  physics: ['力学', '电磁学', '热学', '光学', '原子物理'],
  chemistry: ['无机化学', '有机化学', '物理化学', '分析化学'],
  biology: ['细胞生物学', '遗传学', '生态学', '生理学'],
  history: ['中国古代史', '中国近现代史', '世界史'],
  geography: ['自然地理', '人文地理', '区域地理'],
  politics: ['哲学', '经济学', '政治学', '文化生活'],
}
