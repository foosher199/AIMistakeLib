/**
 * MiniMax AI Service
 * 使用 MiniMax-M2.7 模型进行图像识别和题目解析
 * 基于 Anthropic 兼容 API 格式 (api.minimaxi.com/anthropic)
 *
 * 注意：MiniMax 服务器对 header 名大小写敏感，必须使用原生 https 模块
 * 而不是 fetch（undici 会规范化 header 为小写）
 */

import type { Subject, Difficulty } from '@/types/database'
import type { AIRecognitionResult } from './alibaba'
import https from 'https'

interface MiniMaxResponse {
  id: string
  type: string
  role: string
  model: string
  content: Array<{
    type: string
    text: string
  }>
  stop_reason: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * 使用原生 https 模块发送 POST 请求（保留 header 大小写）
 */
function httpsPost(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body: data })
        })
      }
    )

    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })

    req.write(body)
    req.end()
  })
}

/**
 * 调用 MiniMax API 识别题目
 */
export async function recognizeWithMiniMax(
  imageInput: string
): Promise<AIRecognitionResult[]> {
  const apiKey = process.env.MINIMAX_API_KEY

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY 未配置')
  }

  const systemPrompt = `你是一个专业的题目识别助手。请仔细分析图片中的题目，并按照指定的JSON格式返回结果。

要求：
1. 准确识别题目的完整内容，包括公式和特殊符号
2. 根据题目内容判断学科，必须是以下之一：math（数学）、chinese（语文）、english（英语）、physics（物理）、chemistry（化学）、biology（生物）、history（历史）、geography（地理）、politics（政治）
3. 分析知识点分类（如代数、几何、文言文、阅读理解等）
4. 评估难度级别：easy（简单）、medium（中等）、hard（困难）
5. 如果图片包含答案或解析，请一并提取
6. confidence 表示识别的置信度（0-1之间）
7. 如果图片中有多道题目，请全部识别并返回数组

请严格按照JSON格式返回结果，不要添加markdown代码块标记。`

  const userPrompt = `请识别并提取图中所有的题目，返回以下格式的JSON数组：

[
  {
    "content": "题目内容（完整的题干）",
    "subject": "学科代码（math/chinese/english/physics/chemistry/biology/history/geography/politics）",
    "category": "知识点分类（例如：代数/几何/文言文/阅读理解等）",
    "difficulty": "难度（easy/medium/hard）",
    "answer": "正确答案",
    "explanation": "答案解析（可选）",
    "confidence": 0.95
  }
]

请直接返回JSON数组，不要有其他内容。`

  try {
    // 判断输入类型：HTTP URL 直接使用，base64 则提取纯数据
    const isHttpUrl = imageInput.startsWith('http://') || imageInput.startsWith('https://')

    const imageContent = isHttpUrl
      ? {
          type: 'image',
          source: {
            type: 'url',
            url: imageInput,
          },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageInput.startsWith('data:') ? imageInput.split(',')[1] : imageInput,
          },
        }

    const requestBody = JSON.stringify({
      model: 'MiniMax-M2.7',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    })

    // 使用原生 https 模块，保留 header 大小写
    const { statusCode, body } = await httpsPost(
      'https://api.minimaxi.com/anthropic/v1/messages',
      {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      requestBody,
      25000
    )

    if (statusCode !== 200) {
      throw new Error(`MiniMax API 请求失败: ${statusCode} ${body}`)
    }

    const data = JSON.parse(body) as MiniMaxResponse
    const text = data.content?.[0]?.text

    if (!text || text.trim().length === 0) {
      throw new Error('MiniMax AI 返回的内容为空')
    }

    // 解析 JSON（移除可能的 markdown 代码块标记）
    let jsonStr = text.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const results = JSON.parse(jsonStr) as AIRecognitionResult[]

    // 验证结果格式
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('MiniMax AI 返回的数据格式不正确')
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
        throw new Error('MiniMax AI 返回的题目信息不完整')
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
        result.confidence = 0.9 // 默认置信度
      }
    }

    return results
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('MiniMax AI 返回的 JSON 格式无效，请重试')
    }

    if (error instanceof Error) {
      // 处理超时
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('MiniMax API 连接超时，请检查网络或稍后重试')
      }
      // 处理常见的 MiniMax API 错误
      if (error.message.includes('API key') || error.message.includes('Unauthorized')) {
        throw new Error('MiniMax API Key 无效或未配置')
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('MiniMax API 配额已用完或请求过于频繁')
      }
      if (error.message.includes('content filter') || error.message.includes('safety')) {
        throw new Error('图片内容被 MiniMax 安全过滤器拦截')
      }
      throw error
    }

    throw new Error('MiniMax 识别失败，请重试')
  }
}
