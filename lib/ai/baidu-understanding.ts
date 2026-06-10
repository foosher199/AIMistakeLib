/**
 * 百度图像内容理解服务
 * 直接分析图片内容，不需要先OCR转文本
 * 文档：https://cloud.baidu.com/doc/IMAGEPROCESS/s/7lg6y0i4e
 *
 * 流程：
 * 1. 提交请求获取 task_id（question 要求直接返回 JSON）
 * 2. 轮询获取结果 description
 * 3. description 中尝试解析 JSON 数组
 * 4. 解析成功直接返回 AIRecognitionResult[]，失败抛错由调用方兜底
 */

import { getAccessToken } from './baidu-ocr'
import type { AIRecognitionResult } from './alibaba'
import type { Subject, Difficulty } from '@/types/database'

interface SubmitResponse {
  result?: {
    task_id: string
  }
  error_code?: number
  error_msg?: string
  log_id?: number
}

interface GetResultResponse {
  result?: {
    task_id: string
    ret_code: number // 0:成功 1:处理中
    ret_msg: string  // success / processing
    description: string
  }
  error_code?: number
  error_msg?: string
  log_id?: number
}

const SUBMIT_URL =
  'https://aip.baidubce.com/rest/2.0/image-classify/v1/image-understanding/request'
const GET_RESULT_URL =
  'https://aip.baidubce.com/rest/2.0/image-classify/v1/image-understanding/get-result'

// question 限制 100 字符，使用简短提示
const QUESTION = '请识别图片中的所有题目，返回JSON数组格式，包含content、subject、category、difficulty、answer、explanation字段'

/**
 * 提交图像理解请求
 */
async function submitRequest(
  imageUrl: string,
  accessToken: string
): Promise<string> {
  const url = `${SUBMIT_URL}?access_token=${accessToken}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: imageUrl,
      question: QUESTION,
    }),
  })

  const data: SubmitResponse = await response.json()

  if (data.error_code) {
    throw new Error(
      `百度图像理解提交失败: ${data.error_msg} (code: ${data.error_code})`
    )
  }

  if (!data.result?.task_id) {
    throw new Error('百度图像理解未返回 task_id')
  }

  return data.result.task_id
}

/**
 * 查询图像理解结果
 */
async function getResult(
  taskId: string,
  accessToken: string
): Promise<GetResultResponse['result']> {
  const url = `${GET_RESULT_URL}?access_token=${accessToken}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_id: taskId,
    }),
  })

  const data: GetResultResponse = await response.json()

  if (data.error_code) {
    throw new Error(
      `百度图像理解获取结果失败: ${data.error_msg} (code: ${data.error_code})`
    )
  }

  return data.result
}

/**
 * 从 description 字符串中解析 JSON
 */
function parseResultsFromDescription(description: string): AIRecognitionResult[] {
  // 尝试直接解析
  let jsonStr = description.trim()

  // 移除可能的 markdown 代码块标记
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  const results = JSON.parse(jsonStr) as AIRecognitionResult[]

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('AI 返回的数据格式不正确')
  }

  // 验证并修正每个结果的字段
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

  for (const result of results) {
    if (
      !result.content ||
      !result.subject ||
      !result.category ||
      !result.difficulty ||
      !result.answer
    ) {
      throw new Error('AI 返回的题目信息不完整')
    }

    if (!validSubjects.includes(result.subject)) {
      result.subject = 'math'
    }

    if (!validDifficulties.includes(result.difficulty)) {
      result.difficulty = 'medium'
    }

    if (
      typeof result.confidence !== 'number' ||
      result.confidence < 0 ||
      result.confidence > 1
    ) {
      result.confidence = 0.8
    }
  }

  return results
}

/**
 * 使用百度图像内容理解分析图片
 * 直接返回结构化题目数组（和阿里 vision 模式输出一致）
 */
export async function recognizeWithBaiduUnderstanding(
  imageUrl: string
): Promise<AIRecognitionResult[]> {
  const startTime = Date.now()

  try {
    const accessToken = await getAccessToken()

    // 1. 提交请求
    console.log('[BaiduUnderstanding] 提交请求...')
    const taskId = await submitRequest(imageUrl, accessToken)
    console.log(`[BaiduUnderstanding] task_id: ${taskId}`)

    // 2. 轮询结果（最多30秒，每1秒查询一次）
    const maxWaitMs = 30_000
    const intervalMs = 1_000
    let waited = 0

    while (waited < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      waited += intervalMs

      const result = await getResult(taskId, accessToken)

      if (!result) {
        continue
      }

      if (result.ret_code === 0) {
        console.log(
          `[BaiduUnderstanding] 识别完成, 耗时: ${Date.now() - startTime}ms`
        )

        // 3. 从 description 中解析 JSON
        const description = result.description || ''
        if (!description.trim()) {
          throw new Error('百度图像理解返回内容为空')
        }

        try {
          const results = parseResultsFromDescription(description)
          console.log(
            `[BaiduUnderstanding] JSON解析成功, 题目数: ${results.length}`
          )
          return results
        } catch (parseError) {
          console.error(
            '[BaiduUnderstanding] JSON解析失败，原始内容:',
            description.slice(0, 200)
          )
          throw new Error(
            `百度返回的内容无法解析为题目数据: ${
              parseError instanceof Error ? parseError.message : String(parseError)
            }`
          )
        }
      }

      // ret_code === 1 表示处理中，继续轮询
      console.log(`[BaiduUnderstanding] 处理中... (${waited}ms)`)
    }

    throw new Error('百度图像理解处理超时，请稍后重试')
  } catch (error) {
    console.error('[BaiduUnderstanding] 识别失败:', error)
    throw error
  }
}
