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
1. content: 题目完整内容（包括题干、选项等）
2. subject: 学科，必须是以下之一：math(数学)、chinese(语文)、english(英语)、physics(物理)、chemistry(化学)、biology(生物)、history(历史)、geography(地理)、politics(政治)
3. category: 知识点分类（如代数、几何、文言文、阅读理解、力学、电学等）
4. difficulty: 难度，必须是 easy(简单)、medium(中等)、hard(困难) 之一
5. answer: 正确答案
6. explanation: 答案解析（可选）
7. confidence: 置信度(0-1之间)

请严格按照JSON格式返回结果，不要添加markdown代码块标记。`

const userPromptTemplate = (text: string) => `请分析以下题目文本，提取题目信息：

---
题目文本：
${text}
---

请返回以下格式的JSON：

{
  "content": "完整的题目内容",
  "subject": "学科代码(math/chinese/english/physics/chemistry/biology/history/geography/politics)",
  "category": "知识点分类",
  "difficulty": "难度(easy/medium/hard)",
  "answer": "正确答案",
  "explanation": "解析（可选）",
  "confidence": 0.95
}

注意：
- 如果文本包含多道题目，请合并为一道综合题或选择最主要的一道
- 如果无法确定答案，answer 填"待补充"
- 如果无法确定学科，默认填 "math"
- confidence 根据文本清晰度评估（0-1之间）

请直接返回JSON对象，不要有其他内容。`

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

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPromptTemplate(text) },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })

    clearTimeout(timeoutId)
    console.log(`[DeepSeek] 收到响应, 状态: ${response.status}, 耗时: ${Date.now() - startTime}ms`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API 请求失败: ${response.status} ${errorText}`)
    }

    const data: DeepSeekResponse = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content || content.trim().length === 0) {
      throw new Error('DeepSeek 返回的内容为空')
    }

    // 解析 JSON
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const result = JSON.parse(jsonStr) as TextAnalysisResult

    // 验证必填字段
    if (!result.content || !result.subject || !result.category || !result.difficulty || !result.answer) {
      throw new Error('DeepSeek 返回的题目信息不完整')
    }

    // 验证学科
    const validSubjects: Subject[] = [
      'math', 'chinese', 'english', 'physics', 'chemistry',
      'biology', 'history', 'geography', 'politics',
    ]
    if (!validSubjects.includes(result.subject)) {
      result.subject = 'math'
    }

    // 验证难度
    const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard']
    if (!validDifficulties.includes(result.difficulty)) {
      result.difficulty = 'medium'
    }

    // 确保 confidence 在范围内
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.85
    }

    return [result]
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
