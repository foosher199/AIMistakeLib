/**
 * Baidu OCR Service
 * 使用百度通用文字识别（高精度版）进行文字提取
 * 学科和难度通过关键词匹配推测
 */

import type { Subject, Difficulty } from '@/types/database'
import type { AIRecognitionResult } from './alibaba'

interface BaiduTokenResponse {
  access_token: string
  expires_in: number
}

interface BaiduOCRResponse {
  words_result: Array<{
    words: string
  }>
  words_result_num: number
}

// Token 缓存
let cachedToken: string | null = null
let tokenExpireTime = 0

/**
 * 获取百度 API Access Token
 */
async function getBaiduAccessToken(): Promise<string> {
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY

  if (!apiKey || !secretKey) {
    throw new Error('BAIDU_API_KEY 或 BAIDU_SECRET_KEY 未配置')
  }

  // 如果 token 还在有效期内，直接返回
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken
  }

  try {
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      throw new Error(`获取百度 Token 失败: ${response.status}`)
    }

    const data: BaiduTokenResponse = await response.json()

    // 缓存 token（提前5分钟过期）
    cachedToken = data.access_token
    tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000

    return data.access_token
  } catch (error) {
    throw new Error('获取百度 Access Token 失败')
  }
}

/**
 * 根据文本内容推测学科
 */
function inferSubject(text: string): Subject {
  const subjectKeywords: Record<Subject, string[]> = {
    math: ['函数', '方程', '几何', '代数', '三角', '微积分', '导数', '向量', '矩阵', '概率', '统计', '数列', '不等式', 'sin', 'cos', 'tan', '∫', '∑', '√'],
    chinese: ['文言文', '诗歌', '阅读理解', '作文', '成语', '修辞', '段落', '句子', '字词', '拼音', '古诗', '散文', '小说', '议论文', '说明文'],
    english: ['English', 'vocabulary', 'grammar', 'reading', 'writing', 'listening', 'speaking', 'passage', 'sentence', 'word', 'phrase'],
    physics: ['力学', '电学', '光学', '热学', '声学', '磁场', '电场', '牛顿', '动能', '势能', '功率', '电压', '电流', '电阻', '波', '频率'],
    chemistry: ['化学', '元素', '分子', '原子', '化合物', '反应', '溶液', '酸碱', '氧化', '还原', '有机', '无机', '周期表', 'H₂O', 'CO₂', 'pH'],
    biology: ['生物', '细胞', '基因', 'DNA', 'RNA', '蛋白质', '光合作用', '呼吸作用', '遗传', '进化', '生态', '植物', '动物', '微生物'],
    history: ['历史', '朝代', '战争', '革命', '世纪', '年代', '古代', '近代', '现代', '事件', '人物', '文明', '王朝', '帝国'],
    geography: ['地理', '地形', '气候', '河流', '山脉', '海洋', '城市', '国家', '经纬度', '板块', '地壳', '降水', '温度', '人口', '资源'],
    politics: ['政治', '经济', '社会', '文化', '制度', '法律', '权利', '义务', '民主', '政府', '国家', '公民', '政策', '改革'],
  }

  // 统计每个学科的关键词匹配数
  const scores: Record<Subject, number> = {
    math: 0,
    chinese: 0,
    english: 0,
    physics: 0,
    chemistry: 0,
    biology: 0,
    history: 0,
    geography: 0,
    politics: 0,
  }

  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[subject as Subject] += 1
      }
    }
  }

  // 返回得分最高的学科
  let maxScore = 0
  let bestSubject: Subject = 'math'

  for (const [subject, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      bestSubject = subject as Subject
    }
  }

  return bestSubject
}

/**
 * 根据文本内容推测难度
 */
function inferDifficulty(text: string): Difficulty {
  const easyKeywords = ['基础', '简单', '容易', '入门', '初级']
  const hardKeywords = ['复杂', '困难', '高级', '综合', '应用', '分析', '推导', '证明']

  let easyScore = 0
  let hardScore = 0

  for (const keyword of easyKeywords) {
    if (text.includes(keyword)) easyScore += 1
  }

  for (const keyword of hardKeywords) {
    if (text.includes(keyword)) hardScore += 1
  }

  if (hardScore > easyScore) return 'hard'
  if (easyScore > hardScore) return 'easy'

  // 根据文本长度判断
  if (text.length < 100) return 'easy'
  if (text.length > 300) return 'hard'

  return 'medium'
}

/**
 * 从文本中提取题目分类
 */
function extractCategory(text: string, subject: Subject): string {
  // 根据不同学科的常见分类
  const categoryPatterns: Record<Subject, string[]> = {
    math: ['代数', '几何', '函数', '三角', '概率', '统计', '数列', '不等式', '立体几何', '解析几何'],
    chinese: ['文言文', '诗歌鉴赏', '现代文阅读', '作文', '语言基础', '名著阅读'],
    english: ['语法', '词汇', '阅读理解', '完形填空', '写作', '听力'],
    physics: ['力学', '电学', '光学', '热学', '原子物理'],
    chemistry: ['有机化学', '无机化学', '化学反应', '物质结构', '化学实验'],
    biology: ['细胞生物学', '遗传学', '生态学', '人体生理', '植物学', '动物学'],
    history: ['中国古代史', '中国近代史', '世界史', '文化史'],
    geography: ['自然地理', '人文地理', '区域地理', '地图与地理信息'],
    politics: ['经济生活', '政治生活', '文化生活', '哲学'],
  }

  const patterns = categoryPatterns[subject] || []

  for (const pattern of patterns) {
    if (text.includes(pattern)) {
      return pattern
    }
  }

  // 默认分类
  return '综合'
}

/**
 * 调用百度 OCR API 识别题目
 */
export async function recognizeWithBaidu(
  imageBase64: string
): Promise<AIRecognitionResult[]> {
  try {
    // 获取 access token
    const accessToken = await getBaiduAccessToken()

    // 移除 base64 前缀（如果有）
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // 调用 OCR API
    const response = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `image=${encodeURIComponent(base64Data)}`,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`百度 OCR 请求失败: ${response.status} ${errorText}`)
    }

    const data: BaiduOCRResponse = await response.json()

    if (!data.words_result || data.words_result.length === 0) {
      throw new Error('未识别到文字内容')
    }

    // 合并所有识别的文字
    const fullText = data.words_result.map((item) => item.words).join('\n')

    // 推测学科和难度
    const subject = inferSubject(fullText)
    const difficulty = inferDifficulty(fullText)
    const category = extractCategory(fullText, subject)

    // 尝试分离题目和答案
    // 简单策略：如果文本包含"答案"、"解析"等关键词，尝试分离
    let content = fullText
    let answer = '待补充'
    let explanation: string | undefined

    const answerMatch = fullText.match(
      /(?:答案[:：]|正确答案[:：])\s*(.+?)(?:\n|$)/
    )
    if (answerMatch) {
      answer = answerMatch[1].trim()
      content = fullText.split(answerMatch[0])[0].trim()
    }

    const explanationMatch = fullText.match(
      /(?:解析[:：]|解答[:：])\s*(.+?)(?:\n\n|$)/s
    )
    if (explanationMatch) {
      explanation = explanationMatch[1].trim()
    }

    // 百度 OCR 只能识别单个题目区域
    return [
      {
        content,
        subject,
        category,
        difficulty,
        answer,
        explanation,
        confidence: 0.75, // 百度 OCR 置信度相对较低（因为学科和难度是推测的）
      },
    ]
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error('百度 OCR 识别失败，请重试')
  }
}
