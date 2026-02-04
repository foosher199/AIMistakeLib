import { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  RotateCcw,
  GraduationCap,
  Lightbulb,
  Image as ImageIcon,
  MoreVertical,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUBJECTS, CATEGORIES } from '@/types';
import type { Question } from '@/types';

interface QuestionDetailProps {
  question: Question;
  onBack: () => void;
  onEdit: (id: string, updates: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onMarkMastered: (id: string) => void;
  onReview: (id: string) => void;
}

export function QuestionDetail({
  question,
  onBack,
  onEdit,
  onDelete,
  onMarkMastered,
  onReview,
}: QuestionDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);

  const subject = SUBJECTS.find((s) => s.id === question.subject);

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
    onEdit(question.id, {
      content: editedQuestion.content,
      subject: editedQuestion.subject,
      category: editedQuestion.category,
      difficulty: editedQuestion.difficulty,
      answer: editedQuestion.answer,
      explanation: editedQuestion.explanation,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedQuestion(question);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(question.id);
    setShowDeleteDialog(false);
  };

  const handleReview = () => {
    onReview(question.id);
  };

  return (
    <section className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-[#626a72] hover:text-[#0070a0]"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </Button>

          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-[#f7f9fa] rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-[#626a72]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-[#f43f5e]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-[#dee5eb] overflow-hidden">
          {/* Status Bar */}
          <div
            className={`px-6 py-3 flex items-center justify-between ${
              question.isMastered ? 'bg-[#d1fae5]' : 'bg-[#cce5f3]'
            }`}
          >
            <div className="flex items-center gap-2">
              {question.isMastered ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                  <span className="font-medium text-[#10b981]">已掌握</span>
                </>
              ) : (
                <>
                  <Circle className="w-5 h-5 text-[#0070a0]" />
                  <span className="font-medium text-[#0070a0]">待复习</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#626a72]">
                复习 {question.reviewCount} 次
              </span>
              {question.lastReviewed && (
                <span className="text-[#626a72]">
                  上次：{new Date(question.lastReviewed).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    学科
                  </label>
                  <select
                    value={editedQuestion.subject}
                    onChange={(e) =>
                      setEditedQuestion({
                        ...editedQuestion,
                        subject: e.target.value,
                        category: '',
                      })
                    }
                    className="w-full px-4 py-3 border border-[#c2cdd8] rounded-xl focus:outline-none focus:border-[#0070a0]"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#626a72] mb-2">
                      难度
                    </label>
                    <select
                      value={editedQuestion.difficulty}
                      onChange={(e) =>
                        setEditedQuestion({
                          ...editedQuestion,
                          difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                        })
                      }
                      className="w-full px-4 py-3 border border-[#c2cdd8] rounded-xl focus:outline-none focus:border-[#0070a0]"
                    >
                      <option value="easy">简单</option>
                      <option value="medium">中等</option>
                      <option value="hard">困难</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#626a72] mb-2">
                      分类
                    </label>
                    <select
                      value={editedQuestion.category}
                      onChange={(e) =>
                        setEditedQuestion({
                          ...editedQuestion,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-[#c2cdd8] rounded-xl focus:outline-none focus:border-[#0070a0]"
                    >
                      {(CATEGORIES[editedQuestion.subject] || ['其他']).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    题目内容
                  </label>
                  <textarea
                    value={editedQuestion.content}
                    onChange={(e) =>
                      setEditedQuestion({
                        ...editedQuestion,
                        content: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 border border-[#c2cdd8] rounded-xl focus:outline-none focus:border-[#0070a0] resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    答案
                  </label>
                  <input
                    type="text"
                    value={editedQuestion.answer}
                    onChange={(e) =>
                      setEditedQuestion({
                        ...editedQuestion,
                        answer: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-[#c2cdd8] rounded-xl focus:outline-none focus:border-[#0070a0]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#626a72] mb-2">
                    解析（可选）
                  </label>
                  <textarea
                    value={editedQuestion.explanation || ''}
                    onChange={(e) =>
                      setEditedQuestion({
                        ...editedQuestion,
                        explanation: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 border border-[#c2cdd8] rounded-xl focus:outline-none focus:border-[#0070a0] resize-none"
                    rows={3}
                    placeholder="添加题目解析..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-[#0070a0] hover:bg-[#004968] py-6"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    保存修改
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="px-6 py-6 border-[#c2cdd8]"
                  >
                    <X className="w-5 h-5 mr-2" />
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge
                    className="px-3 py-1.5 text-sm"
                    style={{
                      backgroundColor: subject?.color + '20',
                      color: subject?.color,
                    }}
                  >
                    <span className="mr-1">{subject?.icon}</span>
                    {subject?.name}
                  </Badge>
                  <Badge className={`px-3 py-1.5 text-sm ${getDifficultyColor(question.difficulty)}`}>
                    {getDifficultyLabel(question.difficulty)}
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-[#f7f9fa] text-[#626a72]">
                    {question.category}
                  </Badge>
                </div>

                {/* Question Content */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-[#1f1f1f] mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#0070a0]" />
                    题目
                  </h2>
                  <div className="bg-[#f7f9fa] rounded-2xl p-6">
                    <p className="text-[#1f1f1f] text-lg leading-relaxed">
                      {question.content}
                    </p>
                  </div>
                </div>

                {/* Image if exists */}
                {question.imageUrl && (
                  <div className="mb-8">
                    <h2 className="text-lg font-bold text-[#1f1f1f] mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-[#0070a0]" />
                      原图
                    </h2>
                    <div className="rounded-2xl overflow-hidden border border-[#dee5eb]">
                      <img
                        src={question.imageUrl}
                        alt="Question"
                        className="w-full max-h-80 object-contain bg-[#1f1f1f]"
                      />
                    </div>
                  </div>
                )}

                {/* Answer */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-[#1f1f1f] mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                    答案
                  </h2>
                  <div className="bg-[#d1fae5] rounded-2xl p-6">
                    <p className="text-[#1f1f1f] text-lg font-medium">
                      {question.answer}
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="mb-8">
                    <h2 className="text-lg font-bold text-[#1f1f1f] mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-[#f59e0b]" />
                      解析
                    </h2>
                    <div className="bg-[#fef3c7] rounded-2xl p-6">
                      <p className="text-[#1f1f1f] leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-[#626a72] mb-8 pb-6 border-b border-[#dee5eb]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    添加于 {new Date(question.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <span>•</span>
                  <span>已复习 {question.reviewCount} 次</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {!question.isMastered ? (
                    <Button
                      onClick={() => onMarkMastered(question.id)}
                      className="flex-1 bg-[#10b981] hover:bg-[#059669] py-6"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      标记为已掌握
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onEdit(question.id, { isMastered: false })}
                      variant="outline"
                      className="flex-1 border-[#c2cdd8] py-6"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      重新复习
                    </Button>
                  )}
                  <Button
                    onClick={handleReview}
                    variant="outline"
                    className="flex-1 border-[#0070a0] text-[#0070a0] hover:bg-[#cce5f3] py-6"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    记录复习
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这道错题吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
