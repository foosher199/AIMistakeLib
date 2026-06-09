/**
 * DeepSeek Text Analysis Service
 * 接收 OCR 提取的纯文本，分析题目结构并返回 JSON
 *
 * API: https://api.deepseek.com/v1/chat/completions
 * Model: deepseek-v4-flash
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

const systemPrompt = `你是一个题目解析助手。将用户提供的题目文本解析为结构化数据。

规则：
1. 只输出 JSON 对象，不要输出任何其他文字、分析过程或 markdown
2. 忽略页眉页脚、手写批注、章节标题、个人信息等非题目内容
3. 多道题时分别识别，每道题作为一个独立对象
4. content 字段使用 \\n 分隔题干与选项、多小题之间
5. subject 必须是：math/chinese/english/physics/chemistry/biology/history/geography/politics
6. difficulty 必须是：easy/medium/hard
7. explanation 若原文没有则填"暂无解析"
8. confidence 取值 0-1

输出格式：{"results":[...]}`

const userPromptTemplate = (text: string) =>
  `解析以下题目文本，输出 JSON 对象：

${text}

输出格式：
{"results":[{"content":"题目内容","subject":"学科","category":"分类","difficulty":"难度","answer":"答案","explanation":"解析","confidence":0.9}]}`

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
      temperature: 0,
      response_format: { type: 'json_object' as const },
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

    // 解析 JSON（JSON mode 下应该已经是合法 JSON，但做一层防御）
    let parsed: { results?: TextAnalysisResult[] }
    try {
      parsed = JSON.parse(content.trim()) as { results?: TextAnalysisResult[] }
    } catch {
      throw new Error('DeepSeek 返回的 JSON 格式无效，请重试')
    }

    const results = parsed.results

    if (!Array.isArray(results)) {
      throw new Error('DeepSeek 返回的数据缺少 results 数组')
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
