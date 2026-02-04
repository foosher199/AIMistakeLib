import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  GraduationCap,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SUBJECTS } from '@/types';
import type { Question, ViewMode } from '@/types';

interface QuestionListProps {
  questions: Question[];
  onEdit: (id: string, updates: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onMarkMastered: (id: string) => void;
  onViewChange: (view: ViewMode, questionId?: string) => void;
}

export function QuestionList({
  questions,
  onEdit,
  onDelete,
  onMarkMastered,
  onViewChange,
}: QuestionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchContent = q.content.toLowerCase().includes(query);
        const matchCategory = q.category.toLowerCase().includes(query);
        if (!matchContent && !matchCategory) return false;
      }
      if (filterSubject && q.subject !== filterSubject) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (filterStatus === 'mastered' && !q.isMastered) return false;
      if (filterStatus === 'pending' && q.isMastered) return false;
      return true;
    });
  }, [questions, searchQuery, filterSubject, filterDifficulty, filterStatus]);

  const stats = useMemo(() => {
    const total = questions.length;
    const mastered = questions.filter((q) => q.isMastered).length;
    const pending = total - mastered;
    return { total, mastered, pending };
  }, [questions]);

  const getSubject = (id: string) => SUBJECTS.find((s) => s.id === id);

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy':
        return 'bg-[#d1fae5] text-[#10b981]';
      case 'medium':
        return 'bg-[#fef3c7] text-[#f59e0b]';
      case 'hard':
        return 'bg-[#ffe4e6] text-[#f43f5e]';
      default:
        return 'bg-[#f7f9fa] text-[#626a72]';
    }
  };

  const getDifficultyLabel = (d: string) => {
    switch (d) {
      case 'easy':
        return '简单';
      case 'medium':
        return '中等';
      case 'hard':
        return '困难';
      default:
        return d;
    }
  };

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    onEdit(editingQuestion.id, {
      content: editingQuestion.content,
      subject: editingQuestion.subject,
      category: editingQuestion.category,
      difficulty: editingQuestion.difficulty,
      answer: editingQuestion.answer,
      explanation: editingQuestion.explanation,
    });
    setEditingQuestion(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingQuestion) return;
    onDelete(deletingQuestion.id);
    setDeletingQuestion(null);
  };

  return (
    <section className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1f1f1f] mb-2">我的错题本</h1>
          <p className="text-[#626a72]">管理和复习你的错题，查漏补缺</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#cce5f3] rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#0070a0]" />
              </div>
              <span className="text-sm text-[#626a72]">总错题</span>
            </div>
            <p className="text-3xl font-bold text-[#1f1f1f]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#d1fae5] rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
              </div>
              <span className="text-sm text-[#626a72]">已掌握</span>
            </div>
            <p className="text-3xl font-bold text-[#10b981]">{stats.mastered}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#fef3c7] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <span className="text-sm text-[#626a72]">待复习</span>
            </div>
            <p className="text-3xl font-bold text-[#f59e0b]">{stats.pending}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
              <Input
                placeholder="搜索题目内容或知识点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-[#c2cdd8] focus:border-[#0070a0] rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-6 border-[#c2cdd8] rounded-xl ${
                showFilters ? 'bg-[#cce5f3] text-[#0070a0] border-[#0070a0]' : ''
              }`}
            >
              <Filter className="w-5 h-5 mr-2" />
              筛选
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#dee5eb] flex flex-wrap gap-4">
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-4 py-2 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm focus:outline-none focus:border-[#0070a0]"
              >
                <option value="">所有学科</option>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-4 py-2 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm focus:outline-none focus:border-[#0070a0]"
              >
                <option value="">所有难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm focus:outline-none focus:border-[#0070a0]"
              >
                <option value="">所有状态</option>
                <option value="pending">待复习</option>
                <option value="mastered">已掌握</option>
              </select>
              {(filterSubject || filterDifficulty || filterStatus) && (
                <button
                  onClick={() => {
                    setFilterSubject('');
                    setFilterDifficulty('');
                    setFilterStatus('');
                  }}
                  className="px-4 py-2 text-sm text-[#f43f5e] hover:bg-[#ffe4e6] rounded-lg transition-colors"
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
        </div>

        {/* Question List */}
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-12 text-center">
            <div className="w-20 h-20 bg-[#f7f9fa] rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-[#c2cdd8]" />
            </div>
            <h3 className="text-lg font-bold text-[#1f1f1f] mb-2">暂无错题</h3>
            <p className="text-[#626a72] mb-4">
              {searchQuery || filterSubject || filterDifficulty || filterStatus
                ? '没有找到符合条件的错题'
                : '还没有添加任何错题，快去拍照识题吧！'}
            </p>
            {!searchQuery && !filterSubject && !filterDifficulty && !filterStatus && (
              <Button
                onClick={() => onViewChange('upload')}
                className="bg-[#0070a0] hover:bg-[#004968] text-white"
              >
                拍照识题
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => {
              const subject = getSubject(question.subject);
              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                    question.isMastered
                      ? 'border-[#d1fae5] opacity-75'
                      : 'border-[#dee5eb]'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <button
                        onClick={() =>
                          question.isMastered
                            ? onEdit(question.id, { isMastered: false })
                            : onMarkMastered(question.id)
                        }
                        className="mt-1"
                      >
                        {question.isMastered ? (
                          <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
                        ) : (
                          <Circle className="w-6 h-6 text-[#c2cdd8] hover:text-[#0070a0]" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            className="flex items-center gap-1"
                            style={{
                              backgroundColor: subject?.color + '20',
                              color: subject?.color,
                            }}
                          >
                            <span>{subject?.icon}</span>
                            <span>{subject?.name}</span>
                          </Badge>
                          <Badge className={getDifficultyColor(question.difficulty)}>
                            {getDifficultyLabel(question.difficulty)}
                          </Badge>
                          <Badge variant="secondary" className="bg-[#f7f9fa] text-[#626a72]">
                            {question.category}
                          </Badge>
                        </div>

                        <p
                          className={`text-[#1f1f1f] font-medium mb-2 line-clamp-2 ${
                            question.isMastered ? 'line-through text-[#626a72]' : ''
                          }`}
                        >
                          {question.content}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-[#626a72]">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" />
                            答案：{question.answer}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(question.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                          {question.reviewCount > 0 && (
                            <span className="text-[#0070a0]">
                              已复习 {question.reviewCount} 次
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-[#f7f9fa] rounded-lg transition-colors">
                            <MoreVertical className="w-5 h-5 text-[#626a72]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onViewChange('detail', question.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingQuestion(question)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingQuestion(question)}
                            className="text-[#f43f5e]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑错题</DialogTitle>
              <DialogDescription>修改错题内容和信息</DialogDescription>
            </DialogHeader>
            {editingQuestion && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    学科
                  </label>
                  <select
                    value={editingQuestion.subject}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        subject: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-[#c2cdd8] rounded-lg focus:outline-none focus:border-[#0070a0]"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    难度
                  </label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                      })
                    }
                    className="w-full px-4 py-2 border border-[#c2cdd8] rounded-lg focus:outline-none focus:border-[#0070a0]"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    题目内容
                  </label>
                  <textarea
                    value={editingQuestion.content}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        content: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-[#c2cdd8] rounded-lg focus:outline-none focus:border-[#0070a0] resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    答案
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.answer}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        answer: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-[#c2cdd8] rounded-lg focus:outline-none focus:border-[#0070a0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    解析（可选）
                  </label>
                  <textarea
                    value={editingQuestion.explanation || ''}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        explanation: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-[#c2cdd8] rounded-lg focus:outline-none focus:border-[#0070a0] resize-none"
                    rows={3}
                    placeholder="添加题目解析..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} className="bg-[#0070a0] hover:bg-[#004968]">
                保存修改
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={!!deletingQuestion} onOpenChange={() => setDeletingQuestion(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除这道错题吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingQuestion(null)}>
                取消
              </Button>
              <Button onClick={handleConfirmDelete} variant="destructive">
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
