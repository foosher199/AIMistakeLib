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
import { recognizeWithBaiduPaperCut } from '@/lib/ai/baidu-paper-cut'
import { downloadImageToBase64 } from '@/lib/ai/baidu-ocr'
import type { AIRecognitionResult } from '@/lib/ai/alibaba'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// 请求体验证 schema
const RecognizeRequestSchema = z.object({
  imageUrl: z.string().url('图片URL格式无效'),
  mode: z.enum(['vision', 'text', 'baidu_understanding', 'baidu_paper_cut']).default('baidu_understanding'),
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
  const log = logger('API/recognize')

  try {
    log.step('1. 创建 Supabase 客户端')
    const supabase = await createServerClient()

    log.step('2. 验证用户登录')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    log.step('3. 限流检查 (20次/小时)')
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

    log.step('4. 解析请求体')
    // 解析请求体
    const body = await request.json()

    // 验证请求数据
    const validation = RecognizeRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues.map((err) => err.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { imageUrl, mode } = validation.data

    log.step(`5. 开始识别 (mode: ${mode})`)
    let results: AIRecognitionResult[]

    if (mode === 'text') {
      // ===== 文本模式：OCR + DeepSeek =====
      console.log('[API] 使用文本模式 (OCR + DeepSeek)')

      try {
        // 1. OCR 提取纯文本
        log.step('5.1 [text模式] 开始OCR文字识别')
        const extractedText = await extractTextFromImage(imageUrl)
        log.step(`5.1 [text模式] OCR完成, 提取文字长度: ${extractedText.length}`)

        // 2. DeepSeek 分析文本
        log.step('5.2 [text模式] 开始DeepSeek文本分析')
        results = await analyzeTextWithDeepSeek(extractedText)
        log.step(`5.2 [text模式] DeepSeek分析完成, 识别到 ${results.length} 道题目`)
      } catch (textError) {
        log.error('文本模式失败', textError)
        throw textError
      }
    } else if (mode === 'baidu_understanding') {
      // ===== 百度图像内容理解：直接看图返回结构化JSON =====
      console.log('[API] 使用百度图像理解模式')

      try {
        // 百度直接返回 AIRecognitionResult[]
        results = await recognizeWithBaiduUnderstanding(imageUrl)
      } catch (baiduError) {
        log.error('百度图像理解模式失败', baiduError)
        throw baiduError
      }
    } else if (mode === 'baidu_paper_cut') {
      // ===== 百度试卷切题：专项识别试卷题目 =====
      console.log('[API] 使用百度试卷切题模式')

      try {
        log.step('5.x [baidu_paper_cut模式] 下载图片并转为base64')
        const imageBase64 = await downloadImageToBase64(imageUrl)
        log.step('5.x [baidu_paper_cut模式] 开始百度试卷切题API调用')
        results = await recognizeWithBaiduPaperCut(imageBase64)
        log.step(`5.x [baidu_paper_cut模式] 识别完成, 识别到 ${results.length} 道题目`)
      } catch (paperCutError) {
        log.error('百度试卷切题模式失败', paperCutError)
        throw paperCutError
      }
    } else {
      // ===== 视觉模式：阿里云 qwen-vl-plus 直接看图 =====
      console.log('[API] 使用视觉模式 (阿里云 qwen-vl-plus)')

      try {
        log.step('5.x [vision模式] 开始阿里云API调用')
        results = await recognizeWithAlibaba(imageUrl)
        log.step(`5.x [vision模式] 阿里云API调用完成, 识别到 ${results.length} 道题目`)
      } catch (visionError) {
        log.error('视觉模式失败', visionError)
        throw visionError
      }
    }

    log.step('6. 验证识别结果')
    // 验证结果
    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: '未识别到题目内容，请确保图片清晰可读' },
        { status: 400 }
      )
    }

    log.step('7. 写入草稿表')
    // 将识别结果写入草稿表
    const draftsToInsert = results.map((r) => ({
      user_id: user.id,
      content: r.content,
      subject: r.subject,
      category: r.category,
      difficulty: r.difficulty,
      answer: r.answer,
      explanation: r.explanation ?? null,
      confidence: r.confidence ?? null,
      image_url: imageUrl,
    }))

    const { data: insertedDrafts, error: draftError } = await supabase
      .from('mistake_drafts')
      .insert(draftsToInsert)
      .select('id, content, subject, category, difficulty, answer, explanation, confidence, image_url')

    if (draftError) {
      console.error('[API] 写入草稿表失败:', draftError)
      // 草稿写入失败不影响返回识别结果，只记录日志
    } else {
      log.step(`7.1 写入草稿完成: ${insertedDrafts?.length ?? 0} 条`)
    }

    log.step('8. 删除临时图片')
    // 识别完成后，删除 Storage 中的临时图片
    await deleteTempImage(imageUrl)

    log.done(`识别完成，返回 ${results.length} 条结果`)
    return NextResponse.json({ results, drafts: insertedDrafts })
  } catch (error) {
    log.error('识别失败', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: '识别失败，请稍后重试' },
      { status: 500 }
    )
  }
}
