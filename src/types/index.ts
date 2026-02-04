// 错题数据类型定义

export interface Question {
  id: string;
  content: string;        // 题目内容
  subject: string;        // 学科
  category: string;       // 知识点分类
  difficulty: 'easy' | 'medium' | 'hard';  // 难度
  answer: string;         // 正确答案
  userAnswer?: string;    // 用户答案（可选）
  explanation?: string;   // 解析（可选）
  imageUrl?: string;      // 题目图片
  createdAt: number;      // 创建时间
  updatedAt: number;      // 更新时间
  reviewCount: number;    // 复习次数
  lastReviewed?: number;  // 上次复习时间
  isMastered: boolean;    // 是否已掌握
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  subjectId: string;
}

export type ViewMode = 'home' | 'upload' | 'list' | 'history' | 'edit' | 'detail';

export const SUBJECTS: Subject[] = [
  { id: 'math', name: '数学', icon: '📐', color: '#3b82f6' },
  { id: 'chinese', name: '语文', icon: '📖', color: '#ef4444' },
  { id: 'english', name: '英语', icon: '🔤', color: '#8b5cf6' },
  { id: 'physics', name: '物理', icon: '⚛️', color: '#06b6d4' },
  { id: 'chemistry', name: '化学', icon: '🧪', color: '#10b981' },
  { id: 'biology', name: '生物', icon: '🧬', color: '#22c55e' },
  { id: 'history', name: '历史', icon: '📜', color: '#f59e0b' },
  { id: 'geography', name: '地理', icon: '🌍', color: '#6366f1' },
  { id: 'politics', name: '政治', icon: '🏛️', color: '#ec4899' },
];

export const CATEGORIES: Record<string, string[]> = {
  math: ['代数', '几何', '函数', '概率统计', '数列', '三角函数', '解析几何'],
  chinese: ['阅读理解', '作文', '古诗文', '语言文字运用', '文学常识'],
  english: ['阅读理解', '完形填空', '语法', '写作', '听力', '词汇'],
  physics: ['力学', '电磁学', '热学', '光学', '原子物理'],
  chemistry: ['无机化学', '有机化学', '物理化学', '分析化学'],
  biology: ['细胞生物学', '遗传学', '生态学', '生理学'],
  history: ['中国古代史', '中国近现代史', '世界史'],
  geography: ['自然地理', '人文地理', '区域地理'],
  politics: ['哲学', '经济学', '政治学', '文化生活'],
};
