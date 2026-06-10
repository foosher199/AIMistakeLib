/**
 * 百度试卷切题识别服务
 * 文档：https://cloud.baidu.com/doc/OCR/s/7ltg5wzzi
 *
 * 流程：
 * 1. 提交图像获取结构化题目数据
 * 2. 解析返回的 qus_result 数组
 * 3. 转换为统一的 AIRecognitionResult[] 格式
 */

import { getAccessToken } from './baidu-ocr'
import type { AIRecognitionResult } from './alibaba'
import type { Subject, Difficulty } from '@/types/database'

interface PaperCutResponse {
  log_id?: number
  direction?: number
  qus_result_num?: number
  qus_figure?: Array<{
    fig_location?: number[][]
  }>
  qus_result?: QuestionResult[]
  pdf_file_size?: number
  error_code?: number
  error_msg?: string
}

interface QuestionResult {
  qus_type?: number // 0:选择题 1:判断题 2:填空题 3:问答题 4:其他
  qus_probability?: number
  elem_text?: {
    stem_text?: string    // 题干
    subqus_text?: string  // 子题
    answer_text?: string  // 答案
    option_text?: string  // 选项
    interpretation_text?: string // 参考答案
  }
  qus_location?: number[][]
  qus_element?: QuestionElement[]
}

interface QuestionElement {
  elem_type?: number // 0:题干 1:子题 2:答案 3:选项 4:配图 5:参考答案
  elem_probability?: number
  elem_location?: number[][]
  elem_word?: Array<{
    word_location?: number[][]
    word_type?: string   // handwriting:手写 print:印刷
    word?: string
  }>
}

const PAPER_CUT_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/paper_cut_edu'

// 学科映射
const SUBJECT_MAP: Record<string, Subject> = {
  math: 'math',
  mathematics: 'math',
  数学: 'math',
  chinese: 'chinese',
  语文: 'chinese',
  english: 'english',
  英语: 'english',
  physics: 'physics',
  物理: 'physics',
  chemistry: 'chemistry',
  化学: 'chemistry',
  biology: 'biology',
  生物: 'biology',
  history: 'history',
  历史: 'history',
  geography: 'geography',
  地理: 'geography',
  politics: 'politics',
  政治: 'politics',
}

// 根据题目类型判断难度
function inferDifficulty(content: string, answer: string): Difficulty {
  // 简单的启发式判断
  const longContent = content.length > 100
  const hasMultipleParts = content.includes('且') || content.includes('如果')

  if (longContent || hasMultipleParts) {
    return 'hard'
  }
  return 'medium'
}

// 根据题目内容推断学科
function inferSubject(content: string, optionText?: string): Subject {
  const text = (content + ' ' + (optionText || '')).toLowerCase()

  // 英文关键词
  if (/\b(english|单词|词汇|语法|作文|letter|word|vocabulary|grammar)\b/.test(text)) {
    return 'english'
  }

  // 数学关键词
  if (/\b(数学|计算|方程|函数|几何|代数|加法|减法|乘法|除法|面积|体积|周长|证明|math|equation|geometry|algebra)\b/.test(text)) {
    return 'math'
  }

  // 物理关键词
  if (/\b(物理|力学|电学|光学|热学|能量|速度|力|电压|电流|physics|force|velocity|energy)\b/.test(text)) {
    return 'physics'
  }

  // 化学关键词
  if (/\b(化学|元素|分子|原子|反应|化合价|化学式|chemistry|molecule|atom|reaction)\b/.test(text)) {
    return 'chemistry'
  }

  // 生物关键词
  if (/\b(生物|细胞|基因|进化|生态|动物|植物|biology|cell|gene|evolution|ecology)\b/.test(text)) {
    return 'biology'
  }

  // 历史关键词
  if (/\b(历史|朝代|战争|革命|历史事件|history| dynasty|war|revolution)\b/.test(text)) {
    return 'history'
  }

  // 地理关键词
  if (/\b(地理|地图|气候|国家|城市|经纬度|geography|climate|continent|country)\b/.test(text)) {
    return 'geography'
  }

  // 政治关键词
  if (/\b(政治|经济|文化|社会|制度|政策|politics|economy|government)\b/.test(text)) {
    return 'politics'
  }

  // 语文关键词
  if (/\b(语文|阅读|写作|文言文|古诗|作文|文章|段落|句子|text|passage|article)\b/.test(text)) {
    return 'chinese'
  }

  // 默认数学
  return 'math'
}

// 根据题目类型判断分类
function inferCategory(qusType: number, content: string): string {
  const typeNames: Record<number, string> = {
    0: '选择题',
    1: '判断题',
    2: '填空题',
    3: '问答题',
    4: '其他',
  }

  const baseCategory = typeNames[qusType] || '其他'

  // 尝试从内容中提取更具体的分类
  if (content.includes('计算')) {
    return '计算题'
  }
  if (content.includes('证明')) {
    return '证明题'
  }
  if (content.includes('应用')) {
    return '应用题'
  }

  return baseCategory
}

// 将 elem_word 数组拼接成完整文本
function joinElemWords(elemWords?: Array<{ word?: string }>): string {
  if (!elemWords) return ''
  return elemWords.map((w) => w.word || '').join('')
}

// 将 qus_element 数组合并成完整文本
function joinElements(elements?: QuestionElement[]): string {
  if (!elements) return ''

  const parts: string[] = []

  for (const elem of elements) {
    const text = joinElemWords(elem.elem_word)
    if (text) {
      parts.push(text)
    }
  }

  return parts.join('\n')
}

/**
 * 提交试卷切题请求
 */
async function submitPaperCutRequest(
  imageBase64: string,
  accessToken: string,
  options?: {
    languageType?: 'CHN_ENG' | 'ENG'
    detectDirection?: boolean
    wordsType?: 'handprint_mix' | 'handwring_only'
    spliceText?: boolean
  }
): Promise<PaperCutResponse> {
  const url = `${PAPER_CUT_URL}?access_token=${accessToken}`

  const params = new URLSearchParams()
  params.append('image', imageBase64)

  if (options?.languageType) {
    params.append('language_type', options.languageType)
  }
  if (options?.detectDirection) {
    params.append('detect_direction', 'true')
  }
  if (options?.wordsType) {
    params.append('words_type', options.wordsType)
  }
  if (options?.spliceText) {
    params.append('splice_text', 'true')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data: PaperCutResponse = await response.json()

  if (data.error_code) {
    throw new Error(
      `百度试卷切题识别失败: ${data.error_msg} (code: ${data.error_code})`
    )
  }

  return data
}

/**
 * 解析百度返回的题目结果
 */
function parseResultsFromResponse(data: PaperCutResponse): AIRecognitionResult[] {
  if (!data.qus_result || data.qus_result.length === 0) {
    throw new Error('百度试卷切题识别未返回题目数据')
  }

  const results: AIRecognitionResult[] = []

  for (const qus of data.qus_result) {
    // 提取各部分文本
    const stemText = qus.elem_text?.stem_text || ''
    const subqusText = qus.elem_text?.subqus_text || ''
    const answerText = qus.elem_text?.answer_text || ''
    const optionText = qus.elem_text?.option_text || ''
    const interpretationText = qus.elem_text?.interpretation_text || ''

    // 如果 elem_text 为空，尝试从 elem_element 中提取
    let content = stemText
    let answer = answerText

    if (!content) {
      content = joinElements(qus.qus_element?.filter((e) => e.elem_type === 0))
    }
    if (!answer) {
      // 查找答案元素 (type=2) 或参考答案元素 (type=5)
      const answerElem = qus.qus_element?.find(
        (e) => e.elem_type === 2 || e.elem_type === 5
      )
      answer = joinElemWords(answerElem?.elem_word)
    }

    if (!content.trim()) {
      continue // 跳过空题目
    }

    const qusType = qus.qus_type ?? 4
    const subject = inferSubject(content, optionText)
    const category = inferCategory(qusType, content)
    const difficulty = inferDifficulty(content, answer)

    results.push({
      content: content.trim(),
      subject,
      category,
      difficulty,
      answer: answer.trim() || '未知',
      explanation: interpretationText.trim() || undefined,
      confidence: qus.qus_probability ?? 0.8,
    })
  }

  if (results.length === 0) {
    throw new Error('未能解析出有效题目')
  }

  return results
}

/**
 * 使用百度试卷切题识别分析图片
 */
export async function recognizeWithBaiduPaperCut(
  imageBase64: string,
  options?: {
    languageType?: 'CHN_ENG' | 'ENG'
    detectDirection?: boolean
    wordsType?: 'handprint_mix' | 'handwring_only'
    spliceText?: boolean
  }
): Promise<AIRecognitionResult[]> {
  const startTime = Date.now()

  try {
    const accessToken = await getAccessToken()

    console.log('[BaiduPaperCut] 提交试卷切题请求...')
    const data = await submitPaperCutRequest(imageBase64, accessToken, options)

    console.log(`[BaiduPaperCut] 识别完成, 耗时: ${Date.now() - startTime}ms`)
    console.log(`[BaiduPaperCut] 检测到 ${data.qus_result_num} 道题目`)

    const results = parseResultsFromResponse(data)

    console.log(`[BaiduPaperCut] 解析成功, 有效题目数: ${results.length}`)

    return results
  } catch (error) {
    console.error('[BaiduPaperCut] 识别失败:', error)
    throw error
  }
}
