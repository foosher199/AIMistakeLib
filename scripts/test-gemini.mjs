#!/usr/bin/env node
/**
 * Gemini API 本地测试脚本
 *
 * 用法:
 *   node scripts/test-gemini.mjs <图片路径>
 *
 * 示例:
 *   node scripts/test-gemini.mjs ~/Desktop/test.jpg
 *   node scripts/test-gemini.mjs ./test.png
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
    .find((line) => line.startsWith('GEMINI_API_KEY=') || line.startsWith('GOOGLE_API_KEY='))

  if (!apiKey) {
    log('错误', '.env.local 中未找到 GEMINI_API_KEY 或 GOOGLE_API_KEY', c.red)
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

// 主函数
async function main() {
  const imgPath = process.argv[2]

  if (!imgPath) {
    console.log(`
${c.bold}Gemini API 本地测试脚本${c.reset}

用法: node scripts/test-gemini.mjs <图片路径>

示例:
  node scripts/test-gemini.mjs ~/Desktop/test.jpg
  node scripts/test-gemini.mjs ./assets/sample.png
`)
    process.exit(1)
  }

  const resolvedPath = path.resolve(imgPath)
  if (!fs.existsSync(resolvedPath)) {
    log('错误', `图片文件不存在: ${resolvedPath}`, c.red)
    process.exit(1)
  }

  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.bold}        Gemini API 连接测试${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}${c.reset}\n`)

  // 1. 读取 API Key
  const apiKey = loadEnv()
  log('配置', `API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} 字符)`, c.green)

  // 2. 读取图片
  const imgBuffer = fs.readFileSync(resolvedPath)
  const imgBase64 = imgBuffer.toString('base64')
  log('图片', `路径: ${resolvedPath}`, c.blue)
  log('图片', `大小: ${formatBytes(imgBuffer.length)}`, c.blue)
  log('图片', `Base64: ${formatBytes(imgBase64.length)}`, c.blue)

  // 3. 构造请求体（和项目中完全一致）
  const systemInstruction = `你是一个专业的题目识别助手。请仔细分析图片中的题目，并按照指定的JSON格式返回结果。

要求：
1. 准确识别题目的完整内容，包括公式和特殊符号
2. 根据题目内容判断学科，必须是以下之一：math（数学）、chinese（语文）、english（英语）、physics（物理）、chemistry（化学）、biology（生物）、history（历史）、geography（地理）、politics（政治）
3. 分析知识点分类（如代数、几何、文言文、阅读理解等）
4. 评估难度级别：easy（简单）、medium（中等）、hard（困难）
5. 如果图片包含答案或解析，请一并提取
6. confidence 表示识别的置信度（0-1之间）
7. 如果图片中有多道题目，请全部识别并返回数组

请严格按照JSON Schema返回结果。`

  const prompt = `请识别并提取图中所有的题目，返回以下格式的JSON数组：

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

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imgBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      responseMimeType: 'application/json',
    },
  }

  // 4. 发送请求
  const modelName = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`

  log('请求', `模型: ${modelName}`, c.cyan)
  log('请求', `URL: ${url}`, c.cyan)
  log('请求', `方法: POST`, c.cyan)
  log('请求', `Header: x-goog-api-key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`, c.cyan)
  log('请求', `Body 大小: ${formatBytes(JSON.stringify(requestBody).length)}`, c.cyan)
  console.log('')

  const controller = new AbortController()
  const timeoutMs = 30000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    })

    clearTimeout(timeoutId)
    const elapsed = Date.now() - startTime

    console.log(`${c.bold}${'-'.repeat(60)}${c.reset}`)
    log('响应', `耗时: ${elapsed}ms`, c.green)
    log('响应', `状态: ${response.status} ${response.statusText}`, response.ok ? c.green : c.red)
    console.log('')

    const responseText = await response.text()

    if (!response.ok) {
      log('错误', `HTTP 请求失败`, c.red)
      try {
        const errJson = JSON.parse(responseText)
        console.log(`${c.red}${JSON.stringify(errJson, null, 2)}${c.reset}`)
      } catch {
        console.log(`${c.red}${responseText}${c.reset}`)
      }
      process.exit(1)
    }

    // 解析响应
    const data = JSON.parse(responseText)

    console.log(`${c.bold}原始响应 JSON:${c.reset}`)
    console.log(`${c.gray}${JSON.stringify(data, null, 2).slice(0, 2000)}${data ? '...' : ''}${c.reset}\n`)

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      log('错误', 'AI 返回的内容为空', c.red)
      if (data.promptFeedback?.blockReason) {
        log('错误', `被拦截原因: ${data.promptFeedback.blockReason}`, c.red)
      }
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
    console.log(`${c.green}${c.bold}测试通过！Gemini API 连接正常。${c.reset}`)
    console.log(`${c.bold}${'='.repeat(60)}\n`)

  } catch (error) {
    clearTimeout(timeoutId)
    const elapsed = Date.now() - startTime
    log('错误', `请求异常 (耗时 ${elapsed}ms)`, c.red)

    if (error.name === 'AbortError') {
      log('错误', `连接超时（超过 ${timeoutMs}ms）`, c.red)
      console.log(`\n${c.yellow}可能原因：${c.reset}`)
      console.log('  1. 网络连接问题（代理/VPN 未开启）')
      console.log('  2. Google API 被墙，需要开启代理')
      console.log('  3. 图片过大，传输时间过长')
    } else if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      log('错误', '底层连接超时', c.red)
      console.log(`\n${c.yellow}可能原因：${c.reset}`)
      console.log('  1. 本地网络无法访问 generativelanguage.googleapis.com')
      console.log('  2. DNS 解析失败')
      console.log('  3. 需要开启代理/VPN')
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
