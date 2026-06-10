#!/usr/bin/env node
/**
 * Baidu 试卷切题识别 API 本地测试脚本
 *
 * 用法:
 *   node scripts/test-baidu-paper-cut.mjs <图片路径> [选项]
 *
 * 选项:
 *   --lang=CHN_ENG  中英文（默认）
 *   --lang=ENG      英文
 *   --splice        拼接题目元素每行文本
 *   --hand           仅识别手写文字
 *
 * 示例:
 *   node scripts/test-baidu-paper-cut.mjs ~/Desktop/test.jpg
 *   node scripts/test-baidu-paper-cut.mjs ./test.png --lang=ENG
 */

import fs from 'fs'
import path from 'path'

// 颜色输出
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function log(label, msg, color = c.reset) {
  console.log(`${color}[${label}]${c.reset} ${msg}`)
}

// 读取 .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    log('错误', `找不到 .env.local 文件: ${envPath}`, c.red)
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf-8')

  const apiKey = content
    .split('\n')
    .find((line) => line.startsWith('BAIDU_API_KEY='))

  const secretKey = content
    .split('\n')
    .find((line) => line.startsWith('BAIDU_SECRET_KEY='))

  if (!apiKey || !secretKey) {
    log('错误', '.env.local 中未找到 BAIDU_API_KEY 或 BAIDU_SECRET_KEY', c.red)
    process.exit(1)
  }

  return {
    apiKey: apiKey.split('=')[1].trim(),
    secretKey: secretKey.split('=')[1].trim(),
  }
}

// 格式化字节大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取 Access Token
async function getAccessToken(apiKey, secretKey) {
  log('认证', '正在获取 Access Token...', c.cyan)

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: apiKey,
    client_secret: secretKey,
  })

  const url = `https://aip.baidubce.com/oauth/2.0/token?${params.toString()}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`获取 Token 失败: ${response.status} ${text}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`获取 Token 失败: ${data.error} - ${data.error_description}`)
    }

    log('认证', `Access Token 获取成功 (有效期: ${data.expires_in}秒)`, c.green)
    return data.access_token
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 提交试卷切题请求
async function submitPaperCutRequest(accessToken, imageBase64, options = {}) {
  log('请求', '正在提交试卷切题请求...', c.cyan)

  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/paper_cut_edu?access_token=${accessToken}`

  const params = new URLSearchParams()
  params.append('image', imageBase64)

  if (options.languageType) {
    params.append('language_type', options.languageType)
  }
  if (options.detectDirection) {
    params.append('detect_direction', 'true')
  }
  if (options.wordsType) {
    params.append('words_type', options.wordsType)
  }
  if (options.spliceText) {
    params.append('splice_text', 'true')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
      body: params.toString(),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`提交请求失败: ${response.status} ${text}`)
    }

    const data = await response.json()

    if (data.error_code) {
      throw new Error(`API 错误: ${data.error_code} - ${data.error_msg}`)
    }

    log('请求', `识别完成，检测到 ${data.qus_result_num || 0} 道题目`, c.green)

    // 打印原始返回数据（限制长度）
    const rawJson = JSON.stringify(data, null, 2)
    log('原始数据', `长度: ${rawJson.length} 字符`, c.gray)
    console.log(`${c.gray}${rawJson.slice(0, 3000)}${rawJson.length > 3000 ? '\n...(数据过长已截断)' : ''}${c.reset}\n`)

    return data
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 解析题目类型
function getQuestionTypeName(type) {
  const names = {
    0: '选择题',
    1: '判断题',
    2: '填空题',
    3: '问答题',
    4: '其他',
  }
  return names[type] || '未知'
}

// 解析题目结果
function parseResults(data) {
  if (!data.qus_result || data.qus_result.length === 0) {
    return []
  }

  const results = []

  for (const qus of data.qus_result) {
    // 尝试从 elem_text 获取
    let stemText = qus.elem_text?.stem_text || ''
    let answerText = qus.elem_text?.answer_text || ''
    let optionText = qus.elem_text?.option_text || ''
    let interpretationText = qus.elem_text?.interpretation_text || ''

    // 如果 elem_text 为空，尝试从 qus_element 提取
    if (!stemText && qus.qus_element) {
      for (const elem of qus.qus_element) {
        const text = elem.elem_word?.map((w) => w.word || '').join('') || ''
        if (!text) continue

        switch (elem.elem_type) {
          case 0: // 题干
            stemText = stemText ? stemText + '\n' + text : text
            break
          case 2: // 答案
            answerText = answerText ? answerText + '\n' + text : text
            break
          case 3: // 选项
            optionText = optionText ? optionText + '\n' + text : text
            break
          case 5: // 参考答案
            interpretationText = interpretationText ? interpretationText + '\n' + text : text
            break
        }
      }
    }

    if (!stemText) continue

    results.push({
      type: getQuestionTypeName(qus.qus_type),
      content: stemText,
      answer: answerText || '未知',
      option: optionText,
      explanation: interpretationText,
      confidence: qus.qus_probability,
    })
  }

  return results
}

// 解析命令行选项
function parseArgs() {
  const options = {
    languageType: 'CHN_ENG',
    detectDirection: false,
    wordsType: 'handprint_mix',
    spliceText: false,
  }

  for (const arg of process.argv.slice(3)) {
    if (arg === '--splice') {
      options.spliceText = true
    } else if (arg === '--hand') {
      options.wordsType = 'handwring_only'
    } else if (arg.startsWith('--lang=')) {
      const lang = arg.split('=')[1]
      if (lang === 'ENG') {
        options.languageType = 'ENG'
      }
    } else if (arg === '--detect') {
      options.detectDirection = true
    }
  }

  return options
}

// 主函数
async function main() {
  const imgPath = process.argv[2]

  if (!imgPath) {
    console.log(`
${c.bold}Baidu 试卷切题识别 API 本地测试脚本${c.reset}

用法: node scripts/test-baidu-paper-cut.mjs <图片路径> [选项]

选项:
  --lang=CHN_ENG  中英文（默认）
  --lang=ENG      英文
  --splice        拼接题目元素每行文本
  --hand          仅识别手写文字
  --detect        检测图像朝向

示例:
  node scripts/test-baidu-paper-cut.mjs ~/Desktop/test.jpg
  node scripts/test-baidu-paper-cut.mjs ./test.png --lang=ENG
`)
    process.exit(1)
  }

  const resolvedPath = path.resolve(imgPath)
  if (!fs.existsSync(resolvedPath)) {
    log('错误', `图片文件不存在: ${resolvedPath}`, c.red)
    process.exit(1)
  }

  const options = parseArgs()

  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.bold}        Baidu 试卷切题识别 API 连接测试${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)

  // 1. 读取 API Key 和 Secret Key
  const { apiKey, secretKey } = loadEnv()
  log('配置', `API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`, c.green)
  log('配置', `Secret Key: ${secretKey.slice(0, 4)}...${secretKey.slice(-4)}`, c.green)

  // 2. 读取图片
  const imgBuffer = fs.readFileSync(resolvedPath)
  const imgBase64 = imgBuffer.toString('base64')
  log('图片', `路径: ${resolvedPath}`, c.blue)
  log('图片', `大小: ${formatBytes(imgBuffer.length)}`, c.blue)
  log('图片', `Base64: ${formatBytes(imgBase64.length)}`, c.blue)
  log('选项', `语言: ${options.languageType}, 文字类型: ${options.wordsType}, 拼接: ${options.spliceText}`, c.cyan)

  // 3. 获取 Access Token
  let accessToken
  try {
    accessToken = await getAccessToken(apiKey, secretKey)
  } catch (error) {
    log('错误', `获取 Access Token 失败: ${error.message}`, c.red)
    process.exit(1)
  }

  // 4. 提交请求
  let data
  try {
    data = await submitPaperCutRequest(accessToken, imgBase64, options)
  } catch (error) {
    log('错误', `提交请求失败: ${error.message}`, c.red)
    process.exit(1)
  }

  // 5. 解析并输出结果
  console.log(`\n${c.bold}${'-'.repeat(60)}${c.reset}`)
  console.log(`${c.bold}识别结果:${c.reset}\n`)

  const results = parseResults(data)

  if (results.length === 0) {
    console.log(`${c.yellow}未检测到题目${c.reset}\n`)
  } else {
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      console.log(`${c.bold}题目 ${i + 1} [${r.type}]${c.reset}`)
      console.log(`  ${c.gray}置信度: ${(r.confidence * 100).toFixed(1)}%${c.reset}`)
      console.log(`  ${c.blue}题目:${c.reset} ${r.content.slice(0, 80)}${r.content.length > 80 ? '...' : ''}`)
      console.log(`  ${c.green}答案:${c.reset} ${r.answer}`)
      if (r.option) {
        console.log(`  ${c.cyan}选项:${c.reset} ${r.option.slice(0, 80)}${r.option.length > 80 ? '...' : ''}`)
      }
      if (r.explanation) {
        console.log(`  ${c.yellow}解析:${c.reset} ${r.explanation.slice(0, 80)}${r.explanation.length > 80 ? '...' : ''}`)
      }
      console.log('')
    }
  }

  console.log(`${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.green}${c.bold}测试通过！Baidu 试卷切题识别 API 连接正常。${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)
}

main().catch((error) => {
  log('错误', `未处理的异常: ${error.message}`, c.red)
  console.log(`${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.red}${c.bold}测试失败。${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)
  process.exit(1)
})
