import { useState, useCallback } from 'react';
import { getTCBApp } from '@/config/tcb';
import type { Question } from '@/types';

const COLLECTION_NAME = 'questions';

// 将 TCB 数据转换为 Question
function toQuestion(data: any): Question {
  return {
    id: data._id,
    content: data.content,
    subject: data.subject,
    category: data.category,
    difficulty: data.difficulty,
    answer: data.answer,
    userAnswer: data.userAnswer,
    explanation: data.explanation,
    imageUrl: data.imageUrl,
    createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
    reviewCount: data.reviewCount || 0,
    lastReviewed: data.lastReviewed ? new Date(data.lastReviewed).getTime() : undefined,
    isMastered: data.isMastered || false,
  };
}

// 将 Question 转换为 TCB 数据
function fromQuestion(question: Partial<Question>): Record<string, any> {
  const data: Record<string, any> = {};
  
  if (question.content !== undefined) data.content = question.content;
  if (question.subject !== undefined) data.subject = question.subject;
  if (question.category !== undefined) data.category = question.category;
  if (question.difficulty !== undefined) data.difficulty = question.difficulty;
  if (question.answer !== undefined) data.answer = question.answer;
  if (question.userAnswer !== undefined) data.userAnswer = question.userAnswer;
  if (question.explanation !== undefined) data.explanation = question.explanation;
  if (question.imageUrl !== undefined) data.imageUrl = question.imageUrl;
  if (question.reviewCount !== undefined) data.reviewCount = question.reviewCount;
  if (question.lastReviewed !== undefined) data.lastReviewed = new Date(question.lastReviewed);
  if (question.isMastered !== undefined) data.isMastered = question.isMastered;
  
  data.updatedAt = new Date();
  
  return data;
}

export function useTCBQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前用户的所有错题
  const fetchQuestions = useCallback(async () => {
    const app = getTCBApp();
    const currentUser = app.auth().currentUser;
    
    if (!currentUser) {
      setQuestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const db = app.database();
      const { data } = await db
        .collection(COLLECTION_NAME)
        .where({
          _openid: currentUser.uid,
        })
        .orderBy('createdAt', 'desc')
        .get();
      
      setQuestions((data || []).map(toQuestion));
    } catch (error: any) {
      console.error('Fetch questions failed:', error);
      
      // 检查是否是 CORS 错误
      if (error.message?.includes('CORS') || error.message?.includes('network')) {
        setError('数据库访问被阻止（CORS 错误）。请在腾讯云控制台配置 Web 安全域名，或部署数据库代理云函数。');
      } else {
        setError('加载数据失败: ' + error.message);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 添加错题
  const addQuestion = useCallback(async (
    question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'isMastered'>
  ): Promise<string> => {
    const app = getTCBApp();
    const currentUser = app.auth().currentUser;
    
    if (!currentUser) throw new Error('Not logged in');

    setIsSyncing(true);
    setError(null);
    
    try {
      const db = app.database();
      
      const data = {
        content: question.content,
        subject: question.subject,
        category: question.category,
        difficulty: question.difficulty,
        answer: question.answer,
        userAnswer: question.userAnswer || '',
        explanation: question.explanation || '',
        imageUrl: question.imageUrl || '',
        reviewCount: 0,
        isMastered: false,
        _openid: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await db.collection(COLLECTION_NAME).add(data);
      
      // 更新本地状态
      const newQuestion = toQuestion({ ...data, _id: result.id });
      setQuestions(prev => [newQuestion, ...prev]);
      
      return result.id;
    } catch (error: any) {
      console.error('Add question failed:', error);
      
      if (error.message?.includes('CORS') || error.message?.includes('network')) {
        setError('保存失败：数据库访问被阻止（CORS 错误）');
      } else {
        setError('保存失败: ' + error.message);
      }
      
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 更新错题
  const updateQuestion = useCallback(async (id: string, updates: Partial<Question>): Promise<void> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const app = getTCBApp();
      const db = app.database();
      
      const data = fromQuestion(updates);
      
      await db
        .collection(COLLECTION_NAME)
        .doc(id)
        .update(data);
      
      // 更新本地状态
      setQuestions(prev =>
        prev.map(q => (q.id === id ? { ...q, ...updates, updatedAt: Date.now() } : q))
      );
    } catch (error: any) {
      console.error('Update question failed:', error);
      setError('更新失败: ' + error.message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 删除错题
  const deleteQuestion = useCallback(async (id: string): Promise<void> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const app = getTCBApp();
      const db = app.database();
      
      await db
        .collection(COLLECTION_NAME)
        .doc(id)
        .remove();
      
      // 更新本地状态
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (error: any) {
      console.error('Delete question failed:', error);
      setError('删除失败: ' + error.message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 标记为已掌握
  const markAsMastered = useCallback(async (id: string): Promise<void> => {
    await updateQuestion(id, { isMastered: true });
  }, [updateQuestion]);

  // 记录复习
  const reviewQuestion = useCallback(async (id: string): Promise<void> => {
    const question = questions.find(q => q.id === id);
    if (!question) return;
    
    await updateQuestion(id, {
      reviewCount: question.reviewCount + 1,
      lastReviewed: Date.now(),
    });
  }, [questions, updateQuestion]);

  // 获取统计信息
  const getStats = useCallback(() => {
    const total = questions.length;
    const mastered = questions.filter(q => q.isMastered).length;
    const pending = total - mastered;
    
    return {
      total,
      mastered,
      pending,
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
    isLoading,
    isSyncing,
    error,
    fetchQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    markAsMastered,
    reviewQuestion,
    getStats,
    filterQuestions,
  };
}
