#!/usr/bin/env node
/**
 * MiniMax API 本地测试脚本 (Anthropic 兼容格式)
 *
 * 用法:
 *   node scripts/test-minimax.mjs <图片路径>
 *
 * 示例:
 *   node scripts/test-minimax.mjs ~/Desktop/test.jpg
 *   node scripts/test-minimax.mjs ./test.png
 *   node scripts/test-minimax.mjs scripts/1.jpg
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

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
    .find((line) => line.startsWith('MINIMAX_API_KEY='))

  if (!apiKey) {
    log('错误', '.env.local 中未找到 MINIMAX_API_KEY', c.red)
    process.exit(1)
  }

  return apiKey.split('=')[1].trim()
}

// 格式化字节大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 使用原生 https 模块发送 POST 请求（保留 header 大小写）
function httpsPost(url, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body: data })
        })
      }
    )

    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })

    req.write(body)
    req.end()
  })
}

// 主函数
async function main() {
  const imgPath = process.argv[2]

  if (!imgPath) {
    console.log(`
${c.bold}MiniMax API 本地测试脚本 (Anthropic 兼容格式)${c.reset}

用法: node scripts/test-minimax.mjs <图片路径>

示例:
  node scripts/test-minimax.mjs ~/Desktop/test.jpg
  node scripts/test-minimax.mjs ./assets/sample.png
  node scripts/test-minimax.mjs scripts/1.jpg
`)
    process.exit(1)
  }

  const resolvedPath = path.resolve(imgPath)
  if (!fs.existsSync(resolvedPath)) {
    log('错误', `图片文件不存在: ${resolvedPath}`, c.red)
    process.exit(1)
  }

  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.bold}        MiniMax API 连接测试${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)

  // 1. 读取 API Key
  const apiKey = loadEnv()
  log('配置', `API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} 字符)`, c.green)

  // 2. 读取图片
  const imgBuffer = fs.readFileSync(resolvedPath)
  const imgBase64 = imgBuffer.toString('base64')
  log('图片', `路径: ${resolvedPath}`, c.blue)
  log('图片', `大小: ${formatBytes(imgBuffer.length)}`, c.blue)
  log('图片', `Base64: ${formatBytes(imgBase64.length)}`, c.blue)

  // 3. 构造请求体（Anthropic 兼容格式）
  const systemPrompt = `你是一个专业的题目识别助手。请仔细分析图片中的题目，并按照指定的JSON格式返回结果。

要求：
1. 准确识别题目的完整内容，包括公式和特殊符号
2. 根据题目内容判断学科，必须是以下之一：math（数学）、chinese（语文）、english（英语）、physics（物理）、chemistry（化学）、biology（生物）、history（历史）、geography（地理）、politics（政治）
3. 分析知识点分类（如代数、几何、文言文、阅读理解等）
4. 评估难度级别：easy（简单）、medium（中等）、hard（困难）
5. 如果图片包含答案或解析，请一并提取
6. confidence 表示识别的置信度（0-1之间）
7. 如果图片中有多道题目，请全部识别并返回数组

请严格按照JSON格式返回结果，不要添加markdown代码块标记。`

  const userPrompt = `请识别并提取图中所有的题目，返回以下格式的JSON数组：

[
  {
    "content": "题目内容（完整的题干）",
    "subject": "学科代码（math/chinese/english/physics/chemistry/biology/history/geography/politics）",
    "category": "知识点分类（例如：代数/几何/文言文/阅读理解等）",
    "difficulty": "难度（easy/medium/hard）",
    "answer": "正确答案",
    "explanation": "答案解析（可选）",
    "confidence": 0.95
  }
]

请直接返回JSON数组，不要有其他内容。`

  const requestBody = JSON.stringify({
    model: 'MiniMax-M2.7',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imgBase64,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
  })

  // 4. 发送请求
  const url = 'https://api.minimaxi.com/anthropic/v1/messages'

  log('请求', `模型: MiniMax-M2.7`, c.cyan)
  log('请求', `URL: ${url}`, c.cyan)
  log('请求', `方法: POST`, c.cyan)
  log('请求', `Header: X-Api-Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`, c.cyan)
  log('请求', `Body 大小: ${formatBytes(requestBody.length)}`, c.cyan)
  console.log('')

  const timeoutMs = 30000
  const startTime = Date.now()

  try {
    const { statusCode, body } = await httpsPost(
      url,
      {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      requestBody,
      timeoutMs
    )

    const elapsed = Date.now() - startTime

    console.log(`${c.bold}${'-'.repeat(60)}${c.reset}`)
    log('响应', `耗时: ${elapsed}ms`, c.green)
    log('响应', `状态: ${statusCode}`, statusCode === 200 ? c.green : c.red)
    console.log('')

    if (statusCode !== 200) {
      log('错误', `HTTP 请求失败`, c.red)
      try {
        const errJson = JSON.parse(body)
        console.log(`${c.red}${JSON.stringify(errJson, null, 2)}${c.reset}`)
      } catch {
        console.log(`${c.red}${body}${c.reset}`)
      }
      process.exit(1)
    }

    // 解析响应
    const data = JSON.parse(body)

    console.log(`${c.bold}原始响应 JSON:${c.reset}`)
    console.log(`${c.gray}${JSON.stringify(data, null, 2).slice(0, 2000)}${data ? '...' : ''}${c.reset}\n`)

    const text = data.content?.[0]?.text

    if (!text) {
      log('错误', 'AI 返回的内容为空', c.red)
      process.exit(1)
    }

    // 解析 JSON 结果
    let jsonStr = text.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const results = JSON.parse(jsonStr)

    console.log(`${c.bold}解析结果:${c.reset}`)
    console.log(`${c.green}${JSON.stringify(results, null, 2)}${c.reset}\n`)

    if (Array.isArray(results) && results.length > 0) {
      log('成功', `识别到 ${results.length} 道题目`, c.green)
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.subject}] ${r.content?.slice(0, 40)}... (confidence: ${r.confidence})`)
      })
    } else {
      log('警告', '返回数据格式不正确', c.yellow)
    }

    console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
    console.log(`${c.green}${c.bold}测试通过！MiniMax API 连接正常。${c.reset}`)
    console.log(`${c.bold}${'='.repeat(60)}\n`)

  } catch (error) {
    const elapsed = Date.now() - startTime
    log('错误', `请求异常 (耗时 ${elapsed}ms)`, c.red)

    if (error.message === 'timeout') {
      log('错误', `连接超时（超过 ${timeoutMs}ms）`, c.red)
      console.log(`\n${c.yellow}可能原因：${c.reset}`)
      console.log('  1. 网络连接问题')
      console.log('  2. api.minimaxi.com 无法访问')
      console.log('  3. 图片过大，传输时间过长')
    } else {
      console.log(`${c.red}${error.message}${c.reset}`)
      if (error.cause) {
        console.log(`${c.red}Cause: ${error.cause.message || error.cause}${c.reset}`)
      }
    }

    console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
    console.log(`${c.red}${c.bold}测试失败。${c.reset}`)
    console.log(`${c.bold}${'='.repeat(60)}\n`)
    process.exit(1)
  }
}

main()
