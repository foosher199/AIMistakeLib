/**
 * AI Recognition API
 *
 * POST /api/ai/recognize - AI 识别图片中的题目
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { recognizeWithAlibaba } from '@/lib/ai/alibaba'
import { recognizeWithBaidu } from '@/lib/ai/baidu'
import { recognizeWithGemini } from '@/lib/ai/gemini'
import { z } from 'zod'

// 请求体验证 schema
const RecognizeRequestSchema = z.object({
  imageBase64: z.string().min(1, '图片数据不能为空'),
  provider: z.enum(['alibaba', 'baidu', 'gemini']).default('alibaba'),
})

/**
 * POST /api/ai/recognize
 *
 * 请求体：
 * {
 *   imageBase64: string,  // base64 编码的图片数据
 *   provider: 'alibaba' | 'baidu' | 'gemini'  // AI 服务提供商（默认 alibaba）
 * }
 *
 * 响应：
 * {
 *   results: Array<{
 *     content: string,
 *     subject: string,
 *     category: string,
 *     difficulty: 'easy' | 'medium' | 'hard',
 *     answer: string,
 *     explanation?: string,
 *     confidence: number
 *   }>
 * }
 */
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

    // 解析请求体
    const body = await request.json()

    // 验证请求数据
    const validation = RecognizeRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues.map((err) => err.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { imageBase64, provider } = validation.data

    // 验证 base64 图片格式
    if (
      !imageBase64.startsWith('data:image/') &&
      !imageBase64.match(/^[A-Za-z0-9+/=]+$/)
    ) {
      return NextResponse.json(
        { error: '无效的图片格式，请提供 base64 编码的图片' },
        { status: 400 }
      )
    }

    // 根据提供商选择识别服务
    let results

    try {
      if (provider === 'baidu') {
        results = await recognizeWithBaidu(imageBase64)
      } else if (provider === 'gemini') {
        results = await recognizeWithGemini(imageBase64)
      } else {
        // 默认使用阿里云
        results = await recognizeWithAlibaba(imageBase64)
      }
    } catch (aiError) {
      console.error(`AI 识别失败 (${provider}):`, aiError)

      // 如果是阿里云或 Gemini 失败，尝试自动切换到备用方案
      if (provider === 'alibaba' || provider === 'gemini') {
        try {
          const fallbackProvider = provider === 'alibaba' ? 'Gemini' : '百度 OCR'
          console.log(`${provider === 'alibaba' ? '阿里云' : 'Gemini'} 识别失败，尝试使用${fallbackProvider}...`)

          if (provider === 'alibaba') {
            // 阿里云失败，尝试 Gemini
            try {
              results = await recognizeWithGemini(imageBase64)
            } catch (geminiError) {
              // Gemini 也失败，尝试百度
              console.log('Gemini 识别失败，尝试使用百度 OCR...')
              results = await recognizeWithBaidu(imageBase64)
            }
          } else {
            // Gemini 失败，尝试百度
            results = await recognizeWithBaidu(imageBase64)
          }
        } catch (fallbackError) {
          console.error('备用方案也失败:', fallbackError)
          throw aiError // 抛出原始错误
        }
      } else {
        throw aiError
      }
    }

    // 验证结果
    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: '未识别到题目内容，请确保图片清晰可读' },
        { status: 400 }
      )
    }

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
