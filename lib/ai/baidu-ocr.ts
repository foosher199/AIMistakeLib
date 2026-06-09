/**
 * 百度 OCR 服务
 * 使用百度通用文字识别（高精度版）提取图片中的文字
 * 文档：https://cloud.baidu.com/doc/OCR/s/1k3h7y3db
 */

interface BaiduTokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface BaiduOCRResponse {
  words_result: Array<{ words: string }>
  words_result_num: number
  error_code?: number
  error_msg?: string
}

// 内存缓存 access_token
let tokenCache: {
  token: string
  expiresAt: number
} | null = null

/**
 * 获取百度 OCR access_token（带缓存）
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now()

  // 缓存未过期（提前 1 小时刷新）
  if (tokenCache && tokenCache.expiresAt > now + 3600 * 1000) {
    return tokenCache.token
  }

  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY

  if (!apiKey || !secretKey) {
    throw new Error('BAIDU_API_KEY 或 BAIDU_SECRET_KEY 未配置')
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`

  const response = await fetch(url, { method: 'POST' })
  const data: BaiduTokenResponse = await response.json()

  if (data.error) {
    throw new Error(`百度Token获取失败: ${data.error_description || data.error}`)
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return data.access_token
}

/**
 * 下载图片并转为 base64（去掉 data URI 前缀）
 */
async function downloadImageToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  // 百度限制：图片不超过 4M
  if (buffer.length > 4 * 1024 * 1024) {
    throw new Error('图片超过 4M，无法使用百度 OCR')
  }

  return buffer.toString('base64')
}

/**
 * 调用百度高精度文字识别
 */
async function callBaiduOCR(imageBase64: string, accessToken: string): Promise<string> {
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`

  const params = new URLSearchParams()
  params.append('image', imageBase64)
  // 可选：检测方向、返回概率等
  // params.append('detect_direction', 'true')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data: BaiduOCRResponse = await response.json()

  if (data.error_code) {
    throw new Error(`百度OCR识别失败: ${data.error_msg} (code: ${data.error_code})`)
  }

  if (!data.words_result || data.words_result.length === 0) {
    throw new Error('百度OCR未识别到文字内容')
  }

  // 拼接所有识别结果，保留换行
  return data.words_result.map((item) => item.words).join('\n')
}

/**
 * 使用百度 OCR 从图片 URL 提取纯文本
 * 优先使用高精度版，超配额时可降级为标准版
 */
export async function extractTextWithBaidu(imageUrl: string): Promise<string> {
  const startTime = Date.now()

  try {
    const accessToken = await getAccessToken()
    const imageBase64 = await downloadImageToBase64(imageUrl)
    const text = await callBaiduOCR(imageBase64, accessToken)

    console.log(
      `[BaiduOCR] 识别完成, 耗时: ${Date.now() - startTime}ms, 字数: ${text.length}`
    )

    return text
  } catch (error) {
    console.error('[BaiduOCR] 识别失败:', error)
    throw error
  }
}
