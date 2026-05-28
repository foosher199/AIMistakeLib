#!/usr/bin/env node
/**
 * Alibaba DashScope API 测试脚本（使用 HTTP URL 图片）
 * 基于官方 demo 格式
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
    .find((line) => line.startsWith('ALIBABA_API_KEY='))

  if (!apiKey) {
    log('错误', '.env.local 中未找到 ALIBABA_API_KEY', c.red)
    process.exit(1)
  }

  return apiKey.split('=')[1].trim()
}

async function main() {
  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.bold}    Alibaba DashScope API 测试 (HTTP URL 图片)${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)

  const apiKey = loadEnv()
  log('配置', `API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`, c.green)

  // 官方 demo 图片 URL
  // const imageUrl = 'https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241022/emyrja/dog_and_girl.jpeg'
  const imageUrl = 'https://tkintamowtnsdueiebez.supabase.co/storage/v1/object/public/mistake-images/1779954905332-gpx7oe4es1a.jpg'
  
  const requestBody = {
    model: 'qwen3.6-plus',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
          {
            type: 'text',
            text: '图中描绘的是什么景象?',
          },
        ],
      },
    ],
  }

  const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

  log('请求', `模型: qwen3.6-plus`, c.cyan)
  log('请求', `URL: ${url}`, c.cyan)
  log('请求', `图片: ${imageUrl}`, c.blue)
  console.log('')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)
  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    })

    clearTimeout(timeoutId)
    const elapsed = Date.now() - startTime

    console.log(`${c.bold}${'-'.repeat(60)}${c.reset}`)
    log('响应', `耗时: ${elapsed}ms`, c.green)
    log('响应', `状态: ${response.status}`, response.ok ? c.green : c.red)
    console.log('')

    const responseText = await response.text()

    if (!response.ok) {
      log('错误', `HTTP 请求失败`, c.red)
      console.log(`${c.red}${responseText}${c.reset}`)
      process.exit(1)
    }

    const data = JSON.parse(responseText)

    console.log(`${c.bold}原始响应 JSON:${c.reset}`)
    console.log(`${c.gray}${JSON.stringify(data, null, 2)}${c.reset}\n`)

    const content = data.choices?.[0]?.message?.content
    console.log(`${c.bold}AI 回复:${c.reset}`)
    console.log(`${c.green}${content}${c.reset}\n`)

    console.log(`${c.bold}${'='.repeat(60)}${c.reset}`)
    console.log(`${c.green}${c.bold}测试通过！${c.reset}`)
    console.log(`${c.bold}${'='.repeat(60)}\n`)

  } catch (error) {
    clearTimeout(timeoutId)
    log('错误', error.name === 'AbortError' ? '连接超时（超过 120 秒）' : error.message, c.red)
    process.exit(1)
  }
}

main()
