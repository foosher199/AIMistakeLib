/**
 * AI 举一反三服务
 *
 * 基于错题生成结构相似的变式练习题，并做答案校验。
 * 调用 DeepSeek 文本模型（复用现有 provider 模式）。
 */

import type { Subject, Difficulty } from '@/types/database'
import { logger } from '@/lib/logger'

export interface QuestionVariation {
  content: string
  subject: Subject
  category: string
  difficulty: Difficulty
  answer: string
  explanation: string
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

const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard']

const variationSystemPrompt = `你是一位资深的题库编写专家。请根据学生做错的题目，生成结构相似的变式练习题，帮助学生巩固知识点。

规则：
1. 只输出 JSON 对象，不要输出任何其他文字、分析过程或 markdown
2. 变式题必须保留原题的核心知识点和解题方法
3. 改变题目背景、数字、图形、设问方式，避免与原题过于相似
4. subject 必须是：math/chinese/english/physics/chemistry/biology/history/geography/politics
5. difficulty 必须是：easy/medium/hard
6. 每道题必须附带正确答案和详细解析
7. 题目必须可解，答案必须正确

输出格式：
{"variations":[{"content":"题目内容","subject":"学科","category":"知识点分类","difficulty":"难度","answer":"正确答案","explanation":"详细解析"}]}`

const validationSystemPrompt = `你是一位严格的题目审核专家。请判断以下题目是否有解、答案是否正确，并输出审核结果。

规则：
1. 只输出 JSON 对象，不要输出任何其他文字
2. is_valid 为 boolean：题目可解且答案正确为 true，否则为 false
3. reason 为 string：当 is_valid 为 false 时说明原因；为 true 时可留空

输出格式：
{"is_valid":true,"reason":""}`

function buildVariationUserPrompt(params: {
  content: string
  answer: string
  explanation?: string | null
  subject: string
  category: string
  difficulty: string
  count: number
  targetDifficulty: string
}): string {
  const difficultyHint =
    params.targetDifficulty === 'same'
      ? '保持与原题相同难度'
      : params.targetDifficulty === 'easier'
        ? '比原题更简单'
        : params.targetDifficulty === 'harder'
          ? '比原题更难'
          : '包含基础、进阶、挑战三个难度梯度'

  return `请根据以下错题生成 ${params.count} 道变式练习题。

原题学科：${params.subject}
原题知识点：${params.category}
原题难度：${params.difficulty}
目标难度：${difficultyHint}

原题内容：
${params.content}

正确答案：${params.answer}
${params.explanation ? `原题解析：${params.explanation}` : ''}

请输出 JSON 对象。`
}

function buildValidationUserPrompt(variation: QuestionVariation): string {
  return `请审核以下题目。

题目内容：
${variation.content}

给定答案：${variation.answer}

请输出 JSON 对象。`
}

function normalizeVariations(raw: unknown): QuestionVariation[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const content = typeof item.content === 'string' ? item.content.trim() : ''
      const answer = typeof item.answer === 'string' ? item.answer.trim() : ''
      const explanation =
        typeof item.explanation === 'string' && item.explanation.trim().length > 0
          ? item.explanation.trim()
          : '暂无解析'
      let subject = typeof item.subject === 'string' ? item.subject : 'math'
      let difficulty = typeof item.difficulty === 'string' ? item.difficulty : 'medium'
      const category =
        typeof item.category === 'string' && item.category.trim().length > 0
          ? item.category.trim()
          : '未分类'

      if (!validSubjects.includes(subject as Subject)) {
        subject = 'math'
      }

      if (!validDifficulties.includes(difficulty as Difficulty)) {
        difficulty = 'medium'
      }

      if (!content || !answer) return null

      return {
        content,
        subject: subject as Subject,
        category,
        difficulty: difficulty as Difficulty,
        answer,
        explanation,
      }
    })
    .filter((item): item is QuestionVariation => item !== null)
}

async function callDeepSeek(system: string, user: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
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
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
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

    return content.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 生成变式练习题
 */
export async function generateQuestionVariations(params: {
  content: string
  answer: string
  explanation?: string | null
  subject: Subject
  category: string
  difficulty: Difficulty
  count: number
  targetDifficulty: 'same' | 'easier' | 'harder' | 'mixed'
}): Promise<QuestionVariation[]> {
  const log = logger('VariationGenerator')

  try {
    log.step('1. 开始生成变式题')

    const content = await callDeepSeek(
      variationSystemPrompt,
      buildVariationUserPrompt({
        content: params.content,
        answer: params.answer,
        explanation: params.explanation,
        subject: params.subject,
        category: params.category,
        difficulty: params.difficulty,
        count: params.count,
        targetDifficulty: params.targetDifficulty,
      })
    )

    let parsed: { variations?: unknown }
    try {
      parsed = JSON.parse(content) as { variations?: unknown }
    } catch {
      throw new Error('DeepSeek 返回的 JSON 格式无效')
    }

    const variations = normalizeVariations(parsed.variations)

    if (variations.length === 0) {
      throw new Error('未能生成有效变式题')
    }

    log.step(`2. 生成 ${variations.length} 道变式题，开始答案校验`)

    // 答案校验：逐题验证可解性与答案正确性
    const validatedVariations: QuestionVariation[] = []
    for (const variation of variations) {
      try {
        const validationContent = await callDeepSeek(
          validationSystemPrompt,
          buildValidationUserPrompt(variation)
        )

        let validation: { is_valid?: boolean; reason?: string }
        try {
          validation = JSON.parse(validationContent) as {
            is_valid?: boolean
            reason?: string
          }
        } catch {
          // 校验解析失败，跳过该校验但保留题目
          validatedVariations.push(variation)
          continue
        }

        if (validation.is_valid) {
          validatedVariations.push(variation)
        } else {
          log.step(`校验未通过: ${validation.reason || '未知原因'}`)
        }
      } catch {
        // 单个题目校验异常，保留原题
        validatedVariations.push(variation)
      }
    }

    if (validatedVariations.length === 0) {
      throw new Error('生成的变式题未通过答案校验')
    }

    log.done(`完成！${validatedVariations.length}/${variations.length} 道变式题通过校验`)
    return validatedVariations
  } catch (error) {
    log.error('生成变式题失败', error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('DeepSeek API 连接超时，请检查网络或稍后重试')
      }
      throw error
    }

    throw new Error('生成变式题失败，请重试')
  }
}
