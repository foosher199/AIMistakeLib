import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  GraduationCap,
  Calendar,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Target,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SUBJECTS, CATEGORIES } from '@/types';
import type { Question, ViewMode } from '@/types';

interface HistorySectionProps {
  questions: Question[];
  onViewChange: (view: ViewMode, questionId?: string) => void;
}

export function HistorySection({ questions, onViewChange }: HistorySectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const stats = useMemo(() => {
    const total = questions.length;
    const mastered = questions.filter((q) => q.isMastered).length;
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;

    const bySubject = SUBJECTS.map((subject) => {
      const subjectQuestions = questions.filter((q) => q.subject === subject.id);
      const subjectMastered = subjectQuestions.filter((q) => q.isMastered).length;
      return {
        ...subject,
        total: subjectQuestions.length,
        mastered: subjectMastered,
        rate: subjectQuestions.length > 0
          ? Math.round((subjectMastered / subjectQuestions.length) * 100)
          : 0,
      };
    }).filter((s) => s.total > 0);

    const byDifficulty = {
      easy: {
        total: questions.filter((q) => q.difficulty === 'easy').length,
        mastered: questions.filter((q) => q.difficulty === 'easy' && q.isMastered).length,
      },
      medium: {
        total: questions.filter((q) => q.difficulty === 'medium').length,
        mastered: questions.filter((q) => q.difficulty === 'medium' && q.isMastered).length,
      },
      hard: {
        total: questions.filter((q) => q.difficulty === 'hard').length,
        mastered: questions.filter((q) => q.difficulty === 'hard' && q.isMastered).length,
      },
    };

    return {
      total,
      mastered,
      pending: total - mastered,
      masteryRate,
      bySubject,
      byDifficulty,
    };
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchContent = q.content.toLowerCase().includes(query);
        const matchCategory = q.category.toLowerCase().includes(query);
        if (!matchContent && !matchCategory) return false;
      }
      if (selectedSubject && q.subject !== selectedSubject) return false;
      if (selectedCategory && q.category !== selectedCategory) return false;
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [questions, searchQuery, selectedSubject, selectedCategory, selectedDifficulty]);

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

  const recentQuestions = useMemo(() => {
    return [...questions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [questions]);

  return (
    <section className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1f1f1f] mb-2">历史题库</h1>
          <p className="text-[#626a72]">查看学习进度和错题统计</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#cce5f3] rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#0070a0]" />
              </div>
              <span className="text-sm text-[#626a72]">总错题数</span>
            </div>
            <p className="text-3xl font-bold text-[#1f1f1f]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#d1fae5] rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-[#10b981]" />
              </div>
              <span className="text-sm text-[#626a72]">掌握率</span>
            </div>
            <p className="text-3xl font-bold text-[#10b981]">{stats.masteryRate}%</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#fef3c7] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <span className="text-sm text-[#626a72]">待复习</span>
            </div>
            <p className="text-3xl font-bold text-[#f59e0b]">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#dee5eb]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#ede9fe] rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <span className="text-sm text-[#626a72]">本周新增</span>
            </div>
            <p className="text-3xl font-bold text-[#8b5cf6]">
              {questions.filter((q) => {
                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                return q.createdAt > weekAgo;
              }).length}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Subject Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Subject Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#0070a0]" />
                <h3 className="font-bold text-[#1f1f1f]">学科分布</h3>
              </div>
              {stats.bySubject.length === 0 ? (
                <p className="text-center text-[#626a72] py-4">暂无数据</p>
              ) : (
                <div className="space-y-4">
                  {stats.bySubject.map((subject) => (
                    <div key={subject.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{subject.icon}</span>
                          <span className="text-sm font-medium text-[#1f1f1f]">
                            {subject.name}
                          </span>
                        </div>
                        <span className="text-sm text-[#626a72]">
                          {subject.mastered}/{subject.total}
                        </span>
                      </div>
                      <div className="h-2 bg-[#f7f9fa] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${subject.rate}%`,
                            backgroundColor: subject.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-[#626a72] mt-1">
                        掌握率 {subject.rate}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulty Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#0070a0]" />
                <h3 className="font-bold text-[#1f1f1f]">难度分布</h3>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'easy', label: '简单', color: '#10b981' },
                  { key: 'medium', label: '中等', color: '#f59e0b' },
                  { key: 'hard', label: '困难', color: '#f43f5e' },
                ].map((diff) => {
                  const data = stats.byDifficulty[diff.key as keyof typeof stats.byDifficulty];
                  const rate = data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0;
                  return (
                    <div key={diff.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: diff.color }}
                        />
                        <span className="text-sm text-[#626a72]">{diff.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#1f1f1f] font-medium">
                          {data.mastered}/{data.total}
                        </span>
                        <span className="text-xs text-[#626a72] w-10 text-right">
                          {rate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#0070a0]" />
                <h3 className="font-bold text-[#1f1f1f]">最近添加</h3>
              </div>
              {recentQuestions.length === 0 ? (
                <p className="text-center text-[#626a72] py-4">暂无数据</p>
              ) : (
                <div className="space-y-3">
                  {recentQuestions.map((q) => {
                    const subject = getSubject(q.subject);
                    return (
                      <button
                        key={q.id}
                        onClick={() => onViewChange('detail', q.id)}
                        className="w-full text-left p-3 bg-[#f7f9fa] rounded-xl hover:bg-[#cce5f3]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{subject?.icon}</span>
                          <span className="text-xs text-[#626a72]">
                            {new Date(q.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-sm text-[#1f1f1f] line-clamp-1">{q.content}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Question List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-[#dee5eb] p-5">
              {/* Search and Filters */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                    <Input
                      placeholder="搜索题目内容..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 border-[#c2cdd8] focus:border-[#0070a0] rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedCategory('');
                    }}
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
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm focus:outline-none focus:border-[#0070a0]"
                  >
                    <option value="">所有分类</option>
                    {(CATEGORIES[selectedSubject] || []).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="px-4 py-2 bg-[#f7f9fa] border border-[#c2cdd8] rounded-lg text-sm focus:outline-none focus:border-[#0070a0]"
                  >
                    <option value="">所有难度</option>
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                  {(selectedSubject || selectedCategory || selectedDifficulty) && (
                    <button
                      onClick={() => {
                        setSelectedSubject('');
                        setSelectedCategory('');
                        setSelectedDifficulty('');
                      }}
                      className="px-4 py-2 text-sm text-[#f43f5e] hover:bg-[#ffe4e6] rounded-lg transition-colors"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#626a72]">
                  共 <span className="font-bold text-[#1f1f1f]">{filteredQuestions.length}</span> 道错题
                </p>
              </div>

              {/* Question List */}
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#f7f9fa] rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-[#c2cdd8]" />
                  </div>
                  <p className="text-[#626a72]">没有找到符合条件的错题</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map((question) => {
                    const subject = getSubject(question.subject);
                    return (
                      <button
                        key={question.id}
                        onClick={() => onViewChange('detail', question.id)}
                        className="w-full text-left p-4 bg-[#f7f9fa] rounded-xl hover:bg-[#cce5f3]/20 transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: subject?.color + '20' }}
                          >
                            <span className="text-2xl">{subject?.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: subject?.color + '20',
                                  color: subject?.color,
                                }}
                              >
                                {subject?.name}
                              </Badge>
                              <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                                {getDifficultyLabel(question.difficulty)}
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-white text-[#626a72]">
                                {question.category}
                              </Badge>
                              {question.isMastered && (
                                <Badge className="text-xs bg-[#d1fae5] text-[#10b981]">
                                  已掌握
                                </Badge>
                              )}
                            </div>
                            <p className="text-[#1f1f1f] font-medium line-clamp-2 mb-2">
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
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-[#c2cdd8] group-hover:text-[#0070a0] transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
