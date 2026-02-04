import { useState, useEffect, useCallback } from 'react';
import type { Question } from '@/types';

const STORAGE_KEY = 'cuomeicuo_questions';

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从本地存储加载数据
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQuestions(parsed);
      } catch (e) {
        console.error('Failed to parse questions:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // 保存到本地存储
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  }, [questions, isLoaded]);

  // 添加错题
  const addQuestion = useCallback((question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'isMastered'>) => {
    const newQuestion: Question = {
      ...question,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reviewCount: 0,
      isMastered: false,
    };
    setQuestions(prev => [newQuestion, ...prev]);
    return newQuestion.id;
  }, []);

  // 更新错题
  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === id
          ? { ...q, ...updates, updatedAt: Date.now() }
          : q
      )
    );
  }, []);

  // 删除错题
  const deleteQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  // 标记为已掌握
  const markAsMastered = useCallback((id: string) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === id
          ? { ...q, isMastered: true, updatedAt: Date.now() }
          : q
      )
    );
  }, []);

  // 复习计数
  const reviewQuestion = useCallback((id: string) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === id
          ? {
              ...q,
              reviewCount: q.reviewCount + 1,
              lastReviewed: Date.now(),
              updatedAt: Date.now(),
            }
          : q
      )
    );
  }, []);

  // 获取统计信息
  const getStats = useCallback(() => {
    const total = questions.length;
    const mastered = questions.filter(q => q.isMastered).length;
    const pending = total - mastered;
    const bySubject = SUBJECTS.map(subject => ({
      ...subject,
      count: questions.filter(q => q.subject === subject.id).length,
      mastered: questions.filter(q => q.subject === subject.id && q.isMastered).length,
    }));

    return {
      total,
      mastered,
      pending,
      bySubject,
    };
  }, [questions]);

  // 搜索和筛选
  const filterQuestions = useCallback((params: {
    subject?: string;
    difficulty?: string;
    isMastered?: boolean;
    searchQuery?: string;
  }) => {
    return questions.filter(q => {
      if (params.subject && q.subject !== params.subject) return false;
      if (params.difficulty && q.difficulty !== params.difficulty) return false;
      if (params.isMastered !== undefined && q.isMastered !== params.isMastered) return false;
      if (params.searchQuery) {
        const query = params.searchQuery.toLowerCase();
        const matchContent = q.content.toLowerCase().includes(query);
        const matchCategory = q.category.toLowerCase().includes(query);
        if (!matchContent && !matchCategory) return false;
      }
      return true;
    });
  }, [questions]);

  return {
    questions,
    isLoaded,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    markAsMastered,
    reviewQuestion,
    getStats,
    filterQuestions,
  };
}

import { SUBJECTS } from '@/types';
