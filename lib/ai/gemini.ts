/**
 * Google Gemini AI Service
 * 使用 Gemini 2.0 Flash 模型进行图像识别和题目解析
 * 直接通过 REST API 调用，无需 SDK
 */

import type { Subject, Difficulty } from '@/types/database'
import type { AIRecognitionResult } from './alibaba'

/**
 * 调用 Google Gemini API 识别题目
 */
export async function recognizeWithGemini(
  imageBase64: string
): Promise<AIRecognitionResult[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 或 GOOGLE_API_KEY 未配置')
  }

  const systemInstruction = `你是一个专业的题目识别助手。请仔细分析图片中的题目，并按照指定的JSON格式返回结果。

要求：
1. 准确识别题目的完整内容，包括公式和特殊符号
2. 根据题目内容判断学科，必须是以下之一：math（数学）、chinese（语文）、english（英语）、physics（物理）、chemistry（化学）、biology（生物）、history（历史）、geography（地理）、politics（政治）
3. 分析知识点分类（如代数、几何、文言文、阅读理解等）
4. 评估难度级别：easy（简单）、medium（中等）、hard（困难）
5. 如果图片包含答案或解析，请一并提取
6. confidence 表示识别的置信度（0-1之间）
7. 如果图片中有多道题目，请全部识别并返回数组

请严格按照JSON Schema返回结果。`

  const prompt = `请识别并提取图中所有的题目，返回以下格式的JSON数组：

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
    // 准备图片数据
    const imageData = imageBase64.startsWith('data:')
      ? imageBase64.split(',')[1]
      : imageBase64

    // 调用 Gemini REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.9,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API 请求失败: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text || text.trim().length === 0) {
      throw new Error('Gemini AI 返回的内容为空')
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
      throw new Error('Gemini AI 返回的数据格式不正确')
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
        throw new Error('Gemini AI 返回的题目信息不完整')
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
        result.confidence = 0.85 // 默认置信度
      }
    }

    return results
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Gemini AI 返回的 JSON 格式无效，请重试')
    }

    if (error instanceof Error) {
      // 处理常见的 Gemini API 错误
      if (error.message.includes('API key')) {
        throw new Error('Gemini API Key 无效或未配置')
      }
      if (error.message.includes('quota')) {
        throw new Error('Gemini API 配额已用完')
      }
      if (error.message.includes('safety')) {
        throw new Error('图片内容被 Gemini 安全过滤器拦截')
      }
      throw error
    }

    throw new Error('Gemini 识别失败，请重试')
  }
}
