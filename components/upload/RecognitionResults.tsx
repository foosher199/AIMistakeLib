'use client'

import { useState } from 'react'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { SUBJECTS, DIFFICULTIES } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Edit, Trash2, AlertCircle } from 'lucide-react'
import { useCreateQuestion } from '@/hooks/useQuestions'

interface RecognitionResultsProps {
  results: AIRecognitionResult[]
  onEdit?: (result: AIRecognitionResult, index: number) => void
  onDelete?: (index: number) => void
  onClear?: () => void
}

export function RecognitionResults({ results, onEdit, onDelete, onClear }: RecognitionResultsProps) {
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set())
  const createQuestion = useCreateQuestion()

  const handleSave = async (result: AIRecognitionResult, index: number) => {
    const questionData = {
      content: result.content,
      subject: result.subject,
      category: result.category,
      difficulty: result.difficulty,
      answer: result.answer,
      explanation: result.explanation,
      user_answer: undefined,
      image_url: undefined,
    }

    try {
      await createQuestion.mutateAsync(questionData as any)
      setSavedIndices((prev) => new Set(prev).add(index))
    } catch (error) {
      // 错误已由 useCreateQuestion 的 onError 处理
      console.error('Save question error:', error)
    }
  }

  const handleSaveAll = async () => {
    for (let i = 0; i < results.length; i++) {
      if (!savedIndices.has(i)) {
        await handleSave(results[i], i)
      }
    }
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          识别结果 ({results.length} 道题目)
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAll}
            disabled={savedIndices.size === results.length || createQuestion.isPending}
          >
            {createQuestion.isPending ? '保存中...' : '全部保存'}
          </Button>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

      {/* 结果列表 */}
      <div className="space-y-4">
        {results.map((result, index) => {
          const isSaved = savedIndices.has(index)
          const subjectLabel = SUBJECTS.find((s) => s.id === result.subject)?.label || result.subject
          const difficultyLabel = DIFFICULTIES.find((d) => d.id === result.difficulty)?.label || result.difficulty
          const difficultyColor = {
            easy: 'bg-green-100 text-green-800 border-green-300',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            hard: 'bg-red-100 text-red-800 border-red-300',
          }[result.difficulty]

          return (
            <div
              key={index}
              className={`bg-white rounded-lg border ${
                isSaved ? 'border-green-300 bg-green-50' : 'border-gray-200'
              } p-4 space-y-3`}
            >
              {/* 头部标签 */}
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    {subjectLabel}
                  </Badge>
                  <Badge variant="outline" className={difficultyColor}>
                    {difficultyLabel}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                    {result.category}
                  </Badge>
                  {result.confidence && (
                    <Badge
                      variant="outline"
                      className={
                        result.confidence >= 0.8
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : result.confidence >= 0.6
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          : 'bg-red-100 text-red-700 border-red-300'
                      }
                    >
                      置信度: {(result.confidence * 100).toFixed(0)}%
                    </Badge>
                  )}
                  {isSaved && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已保存
                    </Badge>
                  )}
                </div>

                <div className="flex gap-1">
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {!isSaved && onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(result, index)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 题目内容 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">题目：</p>
                <p className="text-gray-900 whitespace-pre-wrap">{result.content}</p>
              </div>

              {/* 答案 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">答案：</p>
                <p className="text-gray-900 bg-green-50 p-2 rounded">{result.answer}</p>
              </div>

              {/* 解析 */}
              {result.explanation && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">解析：</p>
                  <p className="text-gray-700 bg-blue-50 p-2 rounded whitespace-pre-wrap">
                    {result.explanation}
                  </p>
                </div>
              )}

              {/* 低置信度警告 */}
              {result.confidence && result.confidence < 0.6 && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">识别置信度较低</p>
                    <p className="text-xs mt-1">建议检查识别内容是否准确，必要时手动编辑</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
