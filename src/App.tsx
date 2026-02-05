import { useState, useCallback } from 'react';
import { Navbar } from './sections/Navbar';
import { Hero } from './sections/Hero';
import { UploadSection } from './sections/UploadSection';
import { QuestionList } from './sections/QuestionList';
import { HistorySection } from './sections/HistorySection';
import { QuestionDetail } from './sections/QuestionDetail';
import { AuthSection } from './sections/AuthSection';
import { UserCenter } from './sections/UserCenter';
import { Footer } from './sections/Footer';
import { useTCBAuth } from './hooks/useTCBAuth';
import { useTCBQuestions } from './hooks/useTCBQuestions';
import type { ViewMode } from './types';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  
  // TCB 认证状态
  const {
    user,
    isLoading: authLoading,
    isInitialized,
    isLoggedIn,
    error: authError,
    loginAnonymous,
    sendVerificationCode,
    registerWithVerificationCode,
    bindEmail,
    login,
    logout,
  } = useTCBAuth();

  // TCB 错题数据
  const {
    questions,
    isLoading: questionsLoading,
    isSyncing,
    error: questionsError,
    fetchQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    markAsMastered,
    reviewQuestion,
  } = useTCBQuestions();

  const handleViewChange = useCallback((view: ViewMode, questionId?: string) => {
    setCurrentView(view);
    if (questionId) {
      setSelectedQuestionId(questionId);
    } else {
      setSelectedQuestionId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAddQuestion = useCallback(async (
    question: Parameters<typeof addQuestion>[0]
  ) => {
    try {
      await addQuestion(question);
      toast.success('错题已保存到云端！', {
        description: '数据已同步到腾讯云，可在任何设备查看',
      });
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
      throw error;
    }
  }, [addQuestion]);

  const handleEditQuestion = useCallback(async (id: string, updates: Parameters<typeof updateQuestion>[1]) => {
    try {
      await updateQuestion(id, updates);
      toast.success('修改已同步到云端');
    } catch (error: any) {
      toast.error('更新失败: ' + error.message);
    }
  }, [updateQuestion]);

  const handleDeleteQuestion = useCallback(async (id: string) => {
    try {
      await deleteQuestion(id);
      toast.success('错题已删除');
      if (currentView === 'detail') {
        setCurrentView('list');
      }
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  }, [deleteQuestion, currentView]);

  const handleMarkMastered = useCallback(async (id: string) => {
    try {
      await markAsMastered(id);
      toast.success('恭喜！又掌握了一道题', { icon: '🎉' });
    } catch (error: any) {
      toast.error('操作失败: ' + error.message);
    }
  }, [markAsMastered]);

  const handleReview = useCallback(async (id: string) => {
    try {
      await reviewQuestion(id);
      toast.success('复习记录已更新', { description: '继续保持！' });
    } catch (error: any) {
      toast.error('记录失败: ' + error.message);
    }
  }, [reviewQuestion]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('已退出登录');
      setCurrentView('home');
    } catch (error: any) {
      toast.error('退出失败: ' + error.message);
    }
  }, [logout]);

  const handleAnonymousLogin = useCallback(async () => {
    try {
      await loginAnonymous();
      // 匿名登录成功后加载数据
      await fetchQuestions();
    } catch (error: any) {
      toast.error('登录失败: ' + error.message);
    }
  }, [loginAnonymous, fetchQuestions]);

  const getSelectedQuestion = useCallback(() => {
    return questions.find(q => q.id === selectedQuestionId) || null;
  }, [questions, selectedQuestionId]);

  // 渲染加载状态
  if (!isInitialized || authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#0070a0] animate-spin" />
          <p className="text-[#626a72]">正在初始化...</p>
        </div>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  // 未登录时显示登录页面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f7f9fa]">
        <Toaster position="top-center" richColors />
        <AuthSection
          onLogin={async (email, password) => {
            await login(email, password);
            // 登录成功后加载数据
            await fetchQuestions();
          }}
          onSendVerificationCode={sendVerificationCode}
          onRegister={async (email, verificationCode, verificationInfo, username, password) => {
            await registerWithVerificationCode(email, verificationCode, verificationInfo, username, password);
            // 注册成功后加载数据
            await fetchQuestions();
          }}
          onAnonymousLogin={handleAnonymousLogin}
          isLoading={authLoading}
          error={authError}
        />
      </div>
    );
  }

  const renderContent = () => {
    if (questionsLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#0070a0] animate-spin" />
            <p className="text-[#626a72]">正在同步数据...</p>
          </div>
        </div>
      );
    }

    // 显示数据库错误
    if (questionsError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#f43f5e] p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#ffe4e6] rounded-full flex items-center justify-center">
                <span className="text-[#f43f5e] text-xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-[#1f1f1f]">数据库连接失败</h2>
            </div>
            <p className="text-[#626a72] mb-6">{questionsError}</p>
            <div className="space-y-3">
              <Button 
                onClick={() => fetchQuestions()} 
                className="w-full bg-[#0070a0] hover:bg-[#004968]"
              >
                重试
              </Button>
              <p className="text-sm text-[#626a72] text-center">
                如果问题持续，请在腾讯云控制台配置 Web 安全域名
              </p>
            </div>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'home':
        return <Hero onViewChange={handleViewChange} />;
      
      case 'upload':
        return (
          <UploadSection
            onSave={handleAddQuestion}
            onViewChange={handleViewChange}
          />
        );
      
      case 'list':
        return (
          <QuestionList
            questions={questions}
            onEdit={handleEditQuestion}
            onDelete={handleDeleteQuestion}
            onMarkMastered={handleMarkMastered}
            onViewChange={handleViewChange}
          />
        );
      
      case 'history':
        return (
          <HistorySection
            questions={questions}
            onViewChange={handleViewChange}
          />
        );
      
      case 'detail':
        const question = getSelectedQuestion();
        if (question) {
          return (
            <QuestionDetail
              question={question}
              onBack={() => handleViewChange('list')}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
              onMarkMastered={handleMarkMastered}
              onReview={handleReview}
            />
          );
        }
        return (
          <QuestionList
            questions={questions}
            onEdit={handleEditQuestion}
            onDelete={handleDeleteQuestion}
            onMarkMastered={handleMarkMastered}
            onViewChange={handleViewChange}
          />
        );

      case 'profile':
        return (
          <UserCenter
            user={user!}
            onBindEmail={bindEmail}
            onSendVerificationCode={sendVerificationCode}
            onLogout={handleLogout}
            onViewChange={handleViewChange}
          />
        );

      default:
        return <Hero onViewChange={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <Toaster position="top-center" richColors />
      <Navbar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        user={user}
        onLogout={handleLogout}
      />
      <main className="relative">
        {renderContent()}
      </main>
      {currentView !== 'detail' && <Footer />}
      
      {/* Sync Indicator */}
      {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 z-50">
          <Loader2 className="w-4 h-4 text-[#0070a0] animate-spin" />
          <span className="text-sm text-[#626a72]">同步中...</span>
        </div>
      )}
    </div>
  );
}

export default App;
