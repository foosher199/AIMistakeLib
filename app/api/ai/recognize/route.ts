/**
 * AI Recognition API
 *
 * POST /api/ai/recognize - AI 识别图片中的题目
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { aiRateLimiter } from '@/lib/rate-limit'
import { recognizeWithAlibaba } from '@/lib/ai/alibaba'
import { z } from 'zod'

// 请求体验证 schema
const RecognizeRequestSchema = z.object({
  imageUrl: z.string().url('图片URL格式无效'),
  provider: z.enum(['alibaba']).default('alibaba'),
})

/**
 * POST /api/ai/recognize
 *
 * 请求体：
 * {
 *   imageUrl: string,  // 图片公开URL（如 Supabase Storage URL）
 *   provider: 'alibaba' | 'baidu' | 'gemini' | 'kimi' | 'minimax'  // AI 服务提供商（默认 alibaba）
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

    const { imageUrl, provider } = validation.data

    // 根据提供商选择识别服务
    // 目前只有阿里云可以正常使用，其他模型暂时停用
    let results

    try {
      // 只使用阿里云
      results = await recognizeWithAlibaba(imageUrl)
    } catch (aiError) {
      console.error(`AI 识别失败 (${provider}):`, aiError)
      throw aiError
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
