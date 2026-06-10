/**
 * Alibaba DashScope AI Service
 * 使用 qwen3.6-plus 模型进行图像识别和题目解析
 * 基于 OpenAI 兼容模式 (/compatible-mode/v1/chat/completions)
 */

import type { Subject, Difficulty } from '@/types/database'
import { logger } from '@/lib/logger'

export interface AIRecognitionResult {
  content: string
  subject: Subject
  category: string
  difficulty: Difficulty
  answer: string
  explanation?: string
  confidence?: number
}

interface DashScopeResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    total_tokens: number
  }
}

/**
 * 调用阿里云 DashScope API 识别题目 (OpenAI 兼容模式)
 */
export async function recognizeWithAlibaba(
  imageBase64: string
): Promise<AIRecognitionResult[]> {
  const apiKey = process.env.ALIBABA_API_KEY

  if (!apiKey) {
    throw new Error('ALIBABA_API_KEY 未配置')
  }

  const prompt = `你是一个专业的题目识别助手。请仔细分析这张图片中的题目，并按照以下JSON格式返回结果（可以包含多道题目）：

[
  {
    "content": "题目内容（完整的题干）",
    "subject": "学科（math/chinese/english/physics/chemistry/biology/history/geography/politics）",
    "category": "知识点分类（例如：代数/几何/文言文/阅读理解等）",
    "difficulty": "难度（easy/medium/hard）",
    "answer": "正确答案",
    "explanation": "答案解析（必须给出）",
    "confidence": 0.95
  }
]

要求：
1. 准确识别题目的完整内容
2. 根据题目内容判断学科，必须是上述9个学科之一
3. 分析知识点分类
4. 评估难度级别
5. 如果图片包含答案或解析，请一并提取
6. confidence 表示识别的置信度（0-1之间）
7. 如果图片中有多道题目，请全部识别并返回数组

请直接返回JSON数组，不要有其他内容。`

  const log = logger('Alibaba')

  try {
    log.step('1. 准备请求参数')
    // 支持三种输入：HTTP URL、data URI、纯 base64 字符串
    const imageUrl = imageBase64.startsWith('http://') || imageBase64.startsWith('https://')
      ? imageBase64
      : imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000)

    log.step('2. 发送 API 请求到阿里云 DashScope')
    const startTime = Date.now()

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'qwen3.6-plus',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
          temperature: 0.1,
          top_p: 0.9,
        }),
      }
    )

    clearTimeout(timeoutId)
    const apiElapsed = Date.now() - startTime
    log.step(`3. 收到响应, HTTP状态: ${response.status}, API调用耗时: ${apiElapsed}ms`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Alibaba API 请求失败: ${response.status} ${errorText}`)
    }

    log.step('4. 解析响应 JSON')
    const data: DashScopeResponse = await response.json()
    const content = data.choices[0]?.message?.content
    log.step(`5. 提取 content 成功, 长度: ${content?.length ?? 0}`)

    if (!content || content.trim().length === 0) {
      throw new Error('AI 返回的内容为空')
    }

    log.step('6. 清理 JSON 字符串 (移除 markdown 代码块)')
    // 尝试解析 JSON（移除可能的 markdown 代码块标记）
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    log.step('7. 解析 JSON 为对象')
    const results = JSON.parse(jsonStr) as AIRecognitionResult[]

    log.step('8. 验证结果格式')
    // 验证结果格式
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('AI 返回的数据格式不正确')
    }

    // 验证每个结果的必填字段
    for (const result of results) {
      if (
        !result.content ||
        !result.subject ||
        !result.category ||
        !result.difficulty ||
        !result.answer
      ) {
        throw new Error('AI 返回的题目信息不完整')
      }

      // 验证学科是否合法
      const validSubjects: Subject[] = [
        'math',
        'chinese',
        'english',
        'physics',
        'chemistry',
        'biology',
        'history',
        'geography',
        'politics',
      ]
      if (!validSubjects.includes(result.subject)) {
        result.subject = 'math' // 默认数学
      }

      // 验证难度是否合法
      const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard']
      if (!validDifficulties.includes(result.difficulty)) {
        result.difficulty = 'medium' // 默认中等
      }

      // 确保 confidence 在 0-1 之间
      if (
        typeof result.confidence !== 'number' ||
        result.confidence < 0 ||
        result.confidence > 1
      ) {
        result.confidence = 0.8 // 默认置信度
      }
    }

    log.done(`完成! 共 ${results.length} 道题目`)
    return results
  } catch (error) {
    log.error('识别失败', error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('阿里云 API 连接超时，请检查网络或稍后重试')
      }
      if (error instanceof SyntaxError) {
        throw new Error('AI 返回的 JSON 格式无效，请重试')
      }
      throw error
    }

    throw new Error('识别失败，请重试')
  }
}
