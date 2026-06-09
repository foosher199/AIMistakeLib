/**
 * AI Recognition API
 *
 * POST /api/ai/recognize - AI 识别图片中的题目
 * 支持两种模式：
 *   - vision: 阿里云 qwen-vl-plus 直接看图（高精度，慢，贵）
 *   - text: Tesseract OCR + DeepSeek 文本分析（低精度，快，便宜）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase'
import { aiRateLimiter } from '@/lib/rate-limit'
import { recognizeWithAlibaba } from '@/lib/ai/alibaba'
import { extractTextFromImage } from '@/lib/ai/ocr'
import { analyzeTextWithDeepSeek } from '@/lib/ai/deepseek'
import { recognizeWithBaiduUnderstanding } from '@/lib/ai/baidu-understanding'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { z } from 'zod'

// 请求体验证 schema
const RecognizeRequestSchema = z.object({
  imageUrl: z.string().url('图片URL格式无效'),
  mode: z.enum(['vision', 'text', 'baidu_understanding']).default('text'),
})

/**
 * 从 URL 中提取文件名，删除 Storage 中的临时图片
 */
async function deleteTempImage(imageUrl: string): Promise<void> {
  try {
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const fileName = pathParts[pathParts.length - 1]

    if (fileName) {
      const adminClient = createAdminClient()
      const { error: deleteError } = await adminClient.storage
        .from('mistake-images')
        .remove([fileName])

      if (deleteError) {
        console.error('[Storage] 删除临时图片失败:', deleteError.message)
      } else {
        console.log('[Storage] 临时图片已删除:', fileName)
      }
    }
  } catch (deleteErr) {
    console.error('[Storage] 删除临时图片出错:', deleteErr)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 验证用户登录
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 限流检查：每用户每小时 20 次
    const rateLimit = aiRateLimiter.check(`ai_recognize:${user.id}`, 20)

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000)),
          },
        }
      )
    }

    // 解析请求体
    const body = await request.json()

    // 验证请求数据
    const validation = RecognizeRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues.map((err) => err.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { imageUrl, mode } = validation.data

    let results: AIRecognitionResult[]

    if (mode === 'text') {
      // ===== 文本模式：OCR + DeepSeek =====
      console.log('[API] 使用文本模式 (OCR + DeepSeek)')

      try {
        // 1. OCR 提取纯文本
        const extractedText = await extractTextFromImage(imageUrl)

        // 2. DeepSeek 分析文本
        results = await analyzeTextWithDeepSeek(extractedText)
      } catch (textError) {
        console.error('[API] 文本模式失败:', textError)
        throw textError
      }
    } else if (mode === 'baidu_understanding') {
      // ===== 百度图像内容理解：直接看图返回结构化JSON =====
      console.log('[API] 使用百度图像理解模式')

      try {
        // 百度直接返回 AIRecognitionResult[]
        results = await recognizeWithBaiduUnderstanding(imageUrl)
      } catch (baiduError) {
        console.error('[API] 百度图像理解模式失败:', baiduError)
        throw baiduError
      }
    } else {
      // ===== 视觉模式：阿里云 qwen-vl-plus 直接看图 =====
      console.log('[API] 使用视觉模式 (阿里云 qwen-vl-plus)')

      try {
        results = await recognizeWithAlibaba(imageUrl)
      } catch (visionError) {
        console.error('[API] 视觉模式失败:', visionError)
        throw visionError
      }
    }

    // 验证结果
    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: '未识别到题目内容，请确保图片清晰可读' },
        { status: 400 }
      )
    }

    // 识别完成后，删除 Storage 中的临时图片
    await deleteTempImage(imageUrl)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('POST /api/ai/recognize error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: '识别失败，请稍后重试' },
      { status: 500 }
    )
  }
}
