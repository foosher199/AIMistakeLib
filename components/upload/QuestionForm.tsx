'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUBJECTS, DIFFICULTIES, CATEGORIES, type Subject, type Difficulty } from '@/types/database'
import type { Question, QuestionInsert, QuestionUpdate } from '@/types/database'
import { useCreateQuestion, useUpdateQuestion } from '@/hooks/useQuestions'
import { ChevronDown } from 'lucide-react'

interface QuestionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: Question // 如果传入，则为编辑模式
  initialData?: Partial<QuestionInsert> // 初始数据（用于 AI 识别结果）
}

export function QuestionForm({ open, onOpenChange, question, initialData }: QuestionFormProps) {
  const isEditMode = !!question
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()

  // 表单状态
  const [content, setContent] = useState('')
  const [subject, setSubject] = useState<Subject>('math')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [answer, setAnswer] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  // 错误状态
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 初始化表单数据
  useEffect(() => {
    if (question) {
      // 编辑模式：使用现有题目数据
      setContent(question.content)
      setSubject(question.subject as Subject)
      setCategory(question.category)
      setDifficulty(question.difficulty as Difficulty)
      setAnswer(question.answer)
      setUserAnswer(question.user_answer || '')
      setExplanation(question.explanation || '')
      setImageUrl(question.image_url || '')
    } else if (initialData) {
      // 创建模式：使用初始数据（AI 识别结果）
      setContent(initialData.content || '')
      setSubject((initialData.subject as Subject) || 'math')
      setCategory(initialData.category || '')
      setDifficulty((initialData.difficulty as Difficulty) || 'medium')
      setAnswer(initialData.answer || '')
      setUserAnswer(initialData.user_answer || '')
      setExplanation(initialData.explanation || '')
      setImageUrl(initialData.image_url || '')
    } else {
      // 创建模式：清空表单
      resetForm()
    }
  }, [question, initialData, open])

  const resetForm = () => {
    setContent('')
    setSubject('math')
    setCategory('')
    setDifficulty('medium')
    setAnswer('')
    setUserAnswer('')
    setExplanation('')
    setImageUrl('')
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!content.trim()) {
      newErrors.content = '题目内容不能为空'
    }
    if (!category.trim()) {
      newErrors.category = '知识点分类不能为空'
    }
    if (!answer.trim()) {
      newErrors.answer = '答案不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (isEditMode) {
        // 更新题目
        const updateData: QuestionUpdate = {
          content,
          subject,
          category,
          difficulty,
          answer,
          user_answer: userAnswer || undefined,
          explanation: explanation || undefined,
          image_url: imageUrl || undefined,
        }

        await updateQuestion.mutateAsync({
          id: question.id,
          data: updateData,
        })
      } else {
        // 创建题目
        const createData = {
          content,
          subject,
          category,
          difficulty,
          answer,
          user_answer: userAnswer || undefined,
          explanation: explanation || undefined,
          image_url: imageUrl || undefined,
        }

        await createQuestion.mutateAsync(createData as any)
      }

      onOpenChange(false)
      resetForm()
    } catch (error) {
      // 错误已由 mutation 的 onError 处理
      console.error('Submit error:', error)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  // 当学科改变时，清空分类（因为不同学科的分类不同）
  const handleSubjectChange = (newSubject: Subject) => {
    setSubject(newSubject)
    setCategory('') // 清空分类
  }

  const availableCategories = CATEGORIES[subject] || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '编辑题目' : '添加题目'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 题目内容 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              题目内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入题目内容..."
              className={`w-full min-h-[120px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.content && (
              <p className="text-sm text-red-500">{errors.content}</p>
            )}
          </div>

          {/* 学科和难度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                学科 <span className="text-red-500">*</span>
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {SUBJECTS.find((s) => s.id === subject)?.label}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {SUBJECTS.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => handleSubjectChange(s.id)}
                    >
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                难度 <span className="text-red-500">*</span>
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {DIFFICULTIES.find((d) => d.id === difficulty)?.label}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {DIFFICULTIES.map((d) => (
                    <DropdownMenuItem
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                    >
                      {d.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 知识点分类 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              知识点分类 <span className="text-red-500">*</span>
            </label>
            {availableCategories.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-between ${
                      errors.category ? 'border-red-500' : ''
                    }`}
                  >
                    {category || '请选择知识点分类'}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {availableCategories.map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => setCategory(cat)}>
                      {cat}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => setCategory('其他')}>
                    其他
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="请输入知识点分类"
                className={errors.category ? 'border-red-500' : ''}
              />
            )}
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* 答案 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              正确答案 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="请输入正确答案..."
              className={`w-full min-h-[80px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.answer ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.answer && (
              <p className="text-sm text-red-500">{errors.answer}</p>
            )}
          </div>

          {/* 我的答案 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              我的答案（可选）
            </label>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="请输入您的错误答案..."
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 答案解析 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              答案解析（可选）
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="请输入答案解析..."
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 图片 URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              图片 URL（可选）
            </label>
            <Input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="submit"
              className="bg-[#0070a0] hover:bg-[#005580]"
              disabled={createQuestion.isPending || updateQuestion.isPending}
            >
              {createQuestion.isPending || updateQuestion.isPending
                ? '保存中...'
                : isEditMode
                ? '更新'
                : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
