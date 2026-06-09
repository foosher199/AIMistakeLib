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

严格要求（违反任何一条都会导致输出无法使用）：
1. 只输出 JSON 数组，不要输出任何其他内容。禁止输出分析过程、思考说明、文字描述、markdown 代码块标记（如 \`\`\`json）。
2. 如果文本包含多道题目，请分别识别每一道，返回 JSON 数组。每道题目对应数组中的一个对象。
3. 忽略无效数据：
   - 忽略页眉页脚（如教材名称、页码、出版社信息）
   - 忽略手写批注、涂鸦、无关标注
   - 忽略章节标题、单元介绍等非题目内容
   - 忽略日期、姓名、班级等个人信息
   - 只提取真正的题目（题干、选项、图表标注），丢弃无关文字
4. 每道题的 content 需要格式化排版：
   - 题干与选项之间换行分隔（\\n）
   - 多小题之间换行分隔（\\n）
   - 保持题目原有的层次结构
   - 数学公式、化学方程式保持清晰可读
5. subject: 学科，必须是以下之一：math(数学)、chinese(语文)、english(英语)、physics(物理)、chemistry(化学)、biology(生物)、history(历史)、geography(地理)、politics(政治)
6. category: 知识点分类（如代数、几何、文言文、阅读理解、力学、电学等）
7. difficulty: 难度，必须是 easy(简单)、medium(中等)、hard(困难) 之一
8. answer: 正确答案
9. explanation: 答案解析（必须返回，即使原文没有也要给出合理分析）
10. confidence: 置信度(0-1之间)

请严格按照JSON数组格式返回，不要添加markdown代码块标记。`

const userPromptTemplate = (text: string) => `请分析以下题目文本，提取每道题目的信息，只返回 JSON 数组，不要有任何其他输出。

---
题目文本：
${text}
---

请返回以下格式的JSON数组（严格JSON，不要markdown）：

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
- 不要输出任何分析过程、思考说明或额外文字，只输出 JSON 数组`

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
      max_tokens: 4096,
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
