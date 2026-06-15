/**
 * AI 错因分析服务
 *
 * 基于错题内容、正确答案、用户答案，分析做错原因并给出改进建议。
 * 调用 DeepSeek 文本模型（复用现有 provider 模式）。
 */

import { logger } from '@/lib/logger'

export interface MistakeAnalysisResult {
  tags: string[]
  detail: string
  advice: string
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

const validReasonTags = [
  '概念不清',
  '计算失误',
  '审题偏差',
  '思路卡壳',
  '方法混淆',
  '粗心大意',
]

const systemPrompt = `你是一位经验丰富的教学诊断专家。请根据学生做错的题目，分析其错误原因。

规则：
1. 只输出 JSON 对象，不要输出任何其他文字、分析过程或 markdown
2. tags 字段必须从以下标签中选择一个或多个：${validReasonTags.join('、')}
3. detail 字段用一句话总结为什么会错
4. advice 字段给出具体、可执行的改进建议

输出格式：
{"tags":["概念不清"],"detail":"...","advice":"..."}`

function buildUserPrompt(params: {
  content: string
  answer: string
  userAnswer?: string | null
  subject: string
  category: string
}): string {
  return `请分析以下错题的错误原因。

学科：${params.subject}
知识点：${params.category}
题目内容：
${params.content}

正确答案：${params.answer}
${params.userAnswer ? `学生的答案：${params.userAnswer}` : '学生的答案：未填写'}

请输出 JSON 对象。`
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => tag.length > 0 && validReasonTags.includes(tag))
}

/**
 * 调用 DeepSeek API 分析错题原因
 */
export async function analyzeMistakeReason(params: {
  content: string
  answer: string
  userAnswer?: string | null
  subject: string
  category: string
}): Promise<MistakeAnalysisResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const log = logger('MistakeAnalysis')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    log.step('1. 开始错因分析')

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildUserPrompt(params) },
        ],
        temperature: 0,
        response_format: { type: 'json_object' as const },
      }),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API 请求失败: ${response.status} ${errorText}`)
    }

    const data: DeepSeekResponse = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content || content.trim().length === 0) {
      throw new Error('DeepSeek 返回的内容为空')
    }

    let parsed: Partial<MistakeAnalysisResult>
    try {
      parsed = JSON.parse(content.trim()) as Partial<MistakeAnalysisResult>
    } catch {
      throw new Error('DeepSeek 返回的 JSON 格式无效')
    }

    const tags = normalizeTags(parsed.tags)
    if (tags.length === 0) {
      tags.push('思路卡壳')
    }

    const detail =
      typeof parsed.detail === 'string' && parsed.detail.trim().length > 0
        ? parsed.detail.trim()
        : '未能明确判断错因，建议重新审题并核对关键步骤。'

    const advice =
      typeof parsed.advice === 'string' && parsed.advice.trim().length > 0
        ? parsed.advice.trim()
        : '建议回顾本题涉及的知识点，并做一道同类题巩固。'

    log.done(`错因分析完成: ${tags.join(', ')}`)

    return { tags, detail, advice }
  } catch (error) {
    log.error('错因分析失败', error)

    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('DeepSeek API 连接超时，请检查网络或稍后重试')
      }
      throw error
    }

    throw new Error('错因分析失败，请重试')
  }
}
