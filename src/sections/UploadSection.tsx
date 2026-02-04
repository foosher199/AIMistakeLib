import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Check, Loader2, Sparkles, BookOpen, Save, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOCR } from '@/hooks/useOCR';
import { SUBJECTS, CATEGORIES } from '@/types';
import type { Question, ViewMode } from '@/types';
import type { OCRResult } from '@/hooks/useOCR';

interface UploadSectionProps {
  onSave: (question: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'isMastered'>) => Promise<void>;
  onViewChange: (view: ViewMode) => void;
}

interface QuestionCard extends OCRResult {
  tempId: string;
  isSaved: boolean;
}

export function UploadSection({ onSave, onViewChange }: UploadSectionProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [recognizedQuestions, setRecognizedQuestions] = useState<QuestionCard[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isProcessing, progress, recognize } = useOCR();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setRecognizedQuestions([]);

    // OCR recognition
    const results = await recognize(file);
    
    // Add temp ID to each question
    const questionsWithId = results.map((result, index) => ({
      ...result,
      tempId: `temp-${Date.now()}-${index}`,
      isSaved: false,
    }));
    
    setRecognizedQuestions(questionsWithId);
  }, [recognize]);

  const handleCameraClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setImageUrl(null);
    setRecognizedQuestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDeleteQuestion = useCallback((tempId: string) => {
    setRecognizedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  }, []);

  const handleEditQuestion = useCallback((tempId: string, field: keyof QuestionCard, value: string) => {
    setRecognizedQuestions(prev =>
      prev.map(q =>
        q.tempId === tempId ? { ...q, [field]: value } : q
      )
    );
  }, []);

  const handleSaveQuestion = useCallback(async (question: QuestionCard) => {
    setIsSaving(true);
    try {
      await onSave({
        content: question.content,
        subject: question.subject,
        category: question.category,
        difficulty: question.difficulty,
        answer: question.answer,
        explanation: question.rawResponse?.explanation || '',
      });
      
      // Mark as saved
      setRecognizedQuestions(prev =>
        prev.map(q =>
          q.tempId === question.tempId ? { ...q, isSaved: true } : q
        )
      );
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const handleSaveAll = useCallback(async () => {
    const unsavedQuestions = recognizedQuestions.filter(q => !q.isSaved);
    if (unsavedQuestions.length === 0) return;

    setIsSaving(true);
    try {
      for (const question of unsavedQuestions) {
        await onSave({
          content: question.content,
          subject: question.subject,
          category: question.category,
          difficulty: question.difficulty,
          answer: question.answer,
          explanation: question.rawResponse?.explanation || '',
        });
      }
      
      // Mark all as saved
      setRecognizedQuestions(prev =>
        prev.map(q => ({ ...q, isSaved: true }))
      );
      
      // Redirect to list after a delay
      setTimeout(() => {
        onViewChange('list');
      }, 1000);
    } catch (error) {
      console.error('Save all failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [recognizedQuestions, onSave, onViewChange]);

  const getSubject = (id: string) => SUBJECTS.find(s => s.id === id);

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-[#d1fae5] text-[#10b981]';
      case 'medium': return 'bg-[#fef3c7] text-[#f59e0b]';
      case 'hard': return 'bg-[#ffe4e6] text-[#f43f5e]';
      default: return 'bg-[#f7f9fa] text-[#626a72]';
    }
  };

  const getDifficultyLabel = (d: string) => {
    switch (d) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return d;
    }
  };

  const unsavedCount = recognizedQuestions.filter(q => !q.isSaved).length;

  return (
    <section className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1f1f1f] mb-3">
            拍照识别错题
          </h1>
          <p className="text-[#626a72]">
            上传题目照片，AI 自动识别并提取多个题目
          </p>
        </div>

        {!imageUrl ? (
          /* Upload Area */
          <div className="bg-white rounded-3xl shadow-lg border border-[#dee5eb] p-8">
            <div
              onClick={handleCameraClick}
              className="border-2 border-dashed border-[#c2cdd8] rounded-2xl p-12 text-center cursor-pointer hover:border-[#0070a0] hover:bg-[#f7f9fa] transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-20 h-20 bg-[#cce5f3] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-[#0070a0]" />
              </div>
              <h3 className="text-xl font-bold text-[#1f1f1f] mb-2">
                点击拍照或上传
              </h3>
              <p className="text-[#626a72] mb-4">
                支持 JPG、PNG 格式，建议图片清晰、光线充足
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-[#0070a0]">
                <Upload className="w-4 h-4" />
                <span>选择文件</span>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {[
                { icon: Sparkles, title: '自动识别', desc: 'AI 智能识别题目内容' },
                { icon: BookOpen, title: '批量提取', desc: '一张图识别多道题目' },
                { icon: Check, title: '灵活保存', desc: '选择有效题目保存' },
              ].map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-4 bg-[#f7f9fa] rounded-xl">
                    <div className="w-10 h-10 bg-[#cce5f3] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#0070a0]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1f1f1f] text-sm">{tip.title}</h4>
                      <p className="text-xs text-[#626a72] mt-1">{tip.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Recognition Results */
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#1f1f1f]">原图</h3>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-sm text-[#626a72] hover:text-[#0070a0]"
                >
                  <RotateCcw className="w-4 h-4" />
                  重新上传
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-[#1f1f1f]">
                <img
                  src={imageUrl}
                  alt="Uploaded question"
                  className="w-full max-h-48 object-contain"
                />
              </div>
            </div>

            {/* Recognition Progress */}
            {isProcessing && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-[#0070a0] animate-spin" />
                    <span className="font-medium text-[#1f1f1f]">正在识别题目...</span>
                  </div>
                  <span className="text-sm text-[#626a72]">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Question Cards */}
            {!isProcessing && recognizedQuestions.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#1f1f1f]">
                    识别结果 
                    <span className="text-sm font-normal text-[#626a72] ml-2">
                      共 {recognizedQuestions.length} 题，未保存 {unsavedCount} 题
                    </span>
                  </h3>
                  {unsavedCount > 0 && (
                    <Button
                      onClick={handleSaveAll}
                      disabled={isSaving}
                      className="bg-[#10b981] hover:bg-[#059669]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存全部
                    </Button>
                  )}
                </div>

                <div className="grid gap-4">
                  {recognizedQuestions.map((question, index) => {
                    const subject = getSubject(question.subject);
                    const isSaved = question.isSaved;

                    return (
                      <div
                        key={question.tempId}
                        className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                          isSaved ? 'border-[#d1fae5] opacity-75' : 'border-[#dee5eb]'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-[#f7f9fa] border-b border-[#dee5eb]">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-[#0070a0] text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            {isSaved && (
                              <Badge className="bg-[#d1fae5] text-[#10b981]">
                                <Check className="w-3 h-3 mr-1" />
                                已保存
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isSaved && (
                              <button
                                onClick={() => handleSaveQuestion(question)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#0070a0] text-white text-sm rounded-lg hover:bg-[#004968] transition-colors"
                              >
                                <Save className="w-4 h-4" />
                                保存
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteQuestion(question.tempId)}
                              className="p-2 text-[#626a72] hover:text-[#f43f5e] hover:bg-[#ffe4e6] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 space-y-4">
                          {/* Subject & Difficulty */}
                          <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#626a72]">学科：</span>
                              <select
                                value={question.subject}
                                onChange={(e) => handleEditQuestion(question.tempId, 'subject', e.target.value)}
                                disabled={isSaved}
                                className="px-3 py-1.5 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm text-[#1f1f1f] focus:outline-none focus:border-[#0070a0] disabled:opacity-50"
                              >
                                {SUBJECTS.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#626a72]">难度：</span>
                              <select
                                value={question.difficulty}
                                onChange={(e) => handleEditQuestion(question.tempId, 'difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
                                disabled={isSaved}
                                className="px-3 py-1.5 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm text-[#1f1f1f] focus:outline-none focus:border-[#0070a0] disabled:opacity-50"
                              >
                                <option value="easy">简单</option>
                                <option value="medium">中等</option>
                                <option value="hard">困难</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#626a72]">分类：</span>
                              <select
                                value={question.category}
                                onChange={(e) => handleEditQuestion(question.tempId, 'category', e.target.value)}
                                disabled={isSaved}
                                className="px-3 py-1.5 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm text-[#1f1f1f] focus:outline-none focus:border-[#0070a0] disabled:opacity-50"
                              >
                                {(CATEGORIES[question.subject] || ['其他']).map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {getDifficultyLabel(question.difficulty)}
                            </Badge>
                            <Badge
                              style={{
                                backgroundColor: subject?.color + '20',
                                color: subject?.color,
                              }}
                            >
                              {subject?.icon} {subject?.name}
                            </Badge>
                          </div>

                          {/* Question Content */}
                          <div>
                            <label className="block text-sm text-[#626a72] mb-2">题目内容：</label>
                            <textarea
                              value={question.content}
                              onChange={(e) => handleEditQuestion(question.tempId, 'content', e.target.value)}
                              disabled={isSaved}
                              className="w-full p-4 bg-[#f7f9fa] border border-[#c2cdd8] rounded-xl text-[#1f1f1f] focus:outline-none focus:border-[#0070a0] resize-none disabled:opacity-50"
                              rows={3}
                            />
                          </div>

                          {/* Answer */}
                          <div>
                            <label className="block text-sm text-[#626a72] mb-2">答案：</label>
                            <input
                              type="text"
                              value={question.answer}
                              onChange={(e) => handleEditQuestion(question.tempId, 'answer', e.target.value)}
                              disabled={isSaved}
                              className="w-full p-4 bg-[#f7f9fa] border border-[#c2cdd8] rounded-xl text-[#1f1f1f] focus:outline-none focus:border-[#0070a0] disabled:opacity-50"
                            />
                          </div>

                          {/* Explanation */}
                          <div>
                            <label className="block text-sm text-[#626a72] mb-2">
                              解析：
                              {question.rawResponse?.explanation && (
                                <span className="text-xs text-[#10b981] ml-2">AI 已生成</span>
                              )}
                            </label>
                            <textarea
                              value={question.rawResponse?.explanation || ''}
                              onChange={(e) => {
                                const newRawResponse = { ...question.rawResponse, explanation: e.target.value };
                                handleEditQuestion(question.tempId, 'rawResponse', newRawResponse);
                              }}
                              disabled={isSaved}
                              placeholder="添加题目解析..."
                              className="w-full p-4 bg-[#f7f9fa] border border-[#c2cdd8] rounded-xl text-[#1f1f1f] focus:outline-none focus:border-[#0070a0] resize-none disabled:opacity-50"
                              rows={3}
                            />
                          </div>

                          {/* Confidence */}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-[#626a72]">识别置信度：</span>
                            <div className="flex-1 h-2 bg-[#f7f9fa] rounded-full overflow-hidden max-w-32">
                              <div
                                className="h-full bg-gradient-to-r from-[#0070a0] to-[#2c90c9] rounded-full"
                                style={{ width: `${question.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-[#0070a0] font-medium">
                              {Math.round(question.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Actions */}
                {unsavedCount > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleSaveAll}
                      disabled={isSaving}
                      size="lg"
                      className="bg-[#0070a0] hover:bg-[#004968] px-8"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      保存全部题目 ({unsavedCount})
                    </Button>
                  </div>
                )}

                {unsavedCount === 0 && recognizedQuestions.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-[#10b981] font-medium mb-4">所有题目已保存！</p>
                    <Button
                      onClick={() => onViewChange('list')}
                      className="bg-[#0070a0] hover:bg-[#004968]"
                    >
                      查看我的错题
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
