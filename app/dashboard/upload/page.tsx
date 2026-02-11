'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/upload/ImageUpload'
import { RecognitionResults } from '@/components/upload/RecognitionResults'
import { QuestionForm } from '@/components/upload/QuestionForm'
import { useOCR, type AIProvider } from '@/hooks/useOCR'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Camera, BookOpen, Check } from 'lucide-react'

export default function UploadPage() {
  const { recognize, loading, progress, provider, switchProvider } = useOCR()
  const [results, setResults] = useState<AIRecognitionResult[]>([])
  const [editingResult, setEditingResult] = useState<AIRecognitionResult | undefined>()
  const [formOpen, setFormOpen] = useState(false)

  const handleUpload = async (file: File) => {
    try {
      const recognizedResults = await recognize(file)
      setResults(recognizedResults)
    } catch (error) {
      // 错误已由 useOCR 处理
      console.error('Upload error:', error)
    }
  }

  const handleEdit = (result: AIRecognitionResult) => {
    setEditingResult(result)
    setFormOpen(true)
  }

  const handleClearResults = () => {
    setResults([])
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingResult(undefined)
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">上传错题</h1>
        <p className="text-gray-600">使用 AI 自动识别图片中的错题内容</p>
      </div>

      {/* AI 提供商切换 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">AI 识别引擎</p>
              <p className="text-xs text-gray-500 mt-0.5">
                选择不同的 AI 提供商以获得最佳识别效果
              </p>
            </div>
          </div>

          <Tabs
            value={provider}
            onValueChange={(v) => switchProvider(v as AIProvider)}
          >
            <TabsList>
              <TabsTrigger value="alibaba">阿里云</TabsTrigger>
              <TabsTrigger value="baidu">百度</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            上传图片
          </h2>
        </div>

        <ImageUpload
          onUpload={handleUpload}
          loading={loading}
          progress={progress}
        />

        {/* 特性卡片 */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: '自动识别', desc: 'AI 智能识别题目内容' },
            { icon: BookOpen, title: '批量提取', desc: '一张图识别多道题目' },
            { icon: Check, title: '灵活保存', desc: '选择有效题目保存' },
          ].map((tip, index) => {
            const Icon = tip.icon
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{tip.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{tip.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 识别结果 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <RecognitionResults
            results={results}
            onEdit={handleEdit}
            onClear={handleClearResults}
          />
        </div>
      )}

      {/* 提示信息 */}
      {results.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            使用提示
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>确保图片清晰，光线充足</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>尽量让题目内容完整，避免遮挡</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>支持 JPG、PNG、GIF、WebP 格式</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>单张图片最大 10MB</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>可识别多道题目，系统会自动分离</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>
                如果阿里云识别效果不佳，可尝试切换到百度引擎
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* 编辑表单 */}
      {editingResult && (
        <QuestionForm
          open={formOpen}
          onOpenChange={handleFormClose}
          initialData={{
            content: editingResult.content,
            subject: editingResult.subject,
            category: editingResult.category,
            difficulty: editingResult.difficulty,
            answer: editingResult.answer,
            explanation: editingResult.explanation,
          }}
        />
      )}
    </div>
  )
}
