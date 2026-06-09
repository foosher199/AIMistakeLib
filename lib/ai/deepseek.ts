/**
 * DeepSeek Text Analysis Service
 * 接收 OCR 提取的纯文本，分析题目结构并返回 JSON
 *
 * API: https://api.deepseek.com/v1/chat/completions
 * Model: deepseek-chat
 */

import type { Subject, Difficulty } from '@/types/database'

export interface TextAnalysisResult {
  content: string
  subject: Subject
  category: string
  difficulty: Difficulty
  answer: string
  explanation?: string
  confidence: number
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    total_tokens: number
  }
}

const systemPrompt = `你是一个专业的题目解析助手。请根据提供的题目文本，分析并提取以下信息：

要求：
1. 如果文本包含多道题目，请分别识别每一道，返回 JSON 数组
2. 每道题的 content 需要格式化排版：
   - 题干与选项之间换行分隔
   - 多小题之间换行分隔
   - 保持题目原有的层次结构
   - 数学公式、化学方程式保持清晰可读
3. subject: 学科，必须是以下之一：math(数学)、chinese(语文)、english(英语)、physics(物理)、chemistry(化学)、biology(生物)、history(历史)、geography(地理)、politics(政治)
4. category: 知识点分类（如代数、几何、文言文、阅读理解、力学、电学等）
5. difficulty: 难度，必须是 easy(简单)、medium(中等)、hard(困难) 之一
6. answer: 正确答案
7. explanation: 答案解析（必须返回，即使原文没有也要给出合理分析）
8. confidence: 置信度(0-1之间)

请严格按照JSON数组格式返回，不要添加markdown代码块标记。`

const userPromptTemplate = (text: string) => `请分析以下题目文本，提取每道题目的信息：

---
题目文本：
${text}
---

请返回以下格式的JSON数组：

[
  {
    "content": "完整的题目内容（格式化排版，题干与选项换行分隔）",
    "subject": "学科代码(math/chinese/english/physics/chemistry/biology/history/geography/politics)",
    "category": "知识点分类",
    "difficulty": "难度(easy/medium/hard)",
    "answer": "正确答案",
    "explanation": "答案解析（必须给出）",
    "confidence": 0.95
  }
]

格式化要求：
- content 字段必须格式化：题干、选项、小题之间用换行符(\\n)分隔
- 如果文本包含多道题目，请分别识别并返回多个对象
- 如果无法确定答案，answer 填"待补充"，但 explanation 仍必须给出合理分析
- 如果无法确定学科，默认填 "math"
- confidence 根据文本清晰度评估（0-1之间）

请直接返回JSON数组，不要有其他内容。`

/**
 * 调用 DeepSeek API 分析题目文本
 */
export async function analyzeTextWithDeepSeek(text: string): Promise<TextAnalysisResult[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    console.log('[DeepSeek] 开始分析文本, 字数:', text.length)
    const startTime = Date.now()

    const requestBody = {
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptTemplate(text) },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }

    console.log('[DeepSeek] 请求参数:', JSON.stringify({
      ...requestBody,
      messages: requestBody.messages.map((m) => ({ role: m.role, contentLength: m.content.length })),
    }, null, 2))

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    })

    clearTimeout(timeoutId)
    console.log(`[DeepSeek] 收到响应, 状态: ${response.status}, 耗时: ${Date.now() - startTime}ms`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API 请求失败: ${response.status} ${errorText}`)
    }

    const data: DeepSeekResponse = await response.json()

    console.log('[DeepSeek] 原始返回数据:', JSON.stringify(data, null, 2))

    const content = data.choices[0]?.message?.content

    if (!content || content.trim().length === 0) {
      throw new Error('DeepSeek 返回的内容为空')
    }

    console.log('[DeepSeek] content 原文:', content)

    // 解析 JSON
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let results: TextAnalysisResult[]
    try {
      results = JSON.parse(jsonStr) as TextAnalysisResult[]
    } catch {
      throw new Error('DeepSeek 返回的 JSON 格式无效，请重试')
    }

    if (!Array.isArray(results)) {
      throw new Error('DeepSeek 返回的数据不是数组格式')
    }

    if (results.length === 0) {
      throw new Error('DeepSeek 未返回任何题目')
    }

    const validSubjects: Subject[] = [
      'math', 'chinese', 'english', 'physics', 'chemistry',
      'biology', 'history', 'geography', 'politics',
    ]
    const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard']

    for (const result of results) {
      // 验证必填字段
      if (!result.content || !result.subject || !result.category || !result.difficulty || !result.answer) {
        throw new Error('DeepSeek 返回的题目信息不完整，缺少必要字段')
      }

      // explanation 必须返回，若缺失或为空则填充默认值
      if (!result.explanation || result.explanation.trim().length === 0) {
        result.explanation = '暂无解析'
      }

      // 验证学科
      if (!validSubjects.includes(result.subject)) {
        result.subject = 'math'
      }

      // 验证难度
      if (!validDifficulties.includes(result.difficulty)) {
        result.difficulty = 'medium'
      }

      // 确保 confidence 在范围内
      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        result.confidence = 0.85
      }
    }

    console.log('[DeepSeek] 解析后的结果:', JSON.stringify(results, null, 2))

    return results
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof SyntaxError) {
      throw new Error('DeepSeek 返回的 JSON 格式无效，请重试')
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('DeepSeek API 连接超时，请检查网络或稍后重试')
      }
      throw error
    }

    throw new Error('DeepSeek 分析失败，请重试')
  }
}
