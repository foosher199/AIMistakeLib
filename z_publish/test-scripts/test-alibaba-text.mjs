#!/usr/bin/env node
/**
 * Alibaba DashScope API 文本测试脚本
 * 基于官方 HTTP 请求格式：POST /chat/completions
 *
 * 用法:
 *   node scripts/test-alibaba-text.mjs
 *
 * 示例:
 *   node scripts/test-alibaba-text.mjs
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

// 主函数
async function main() {
  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.bold}        Alibaba DashScope API 文本测试${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)

  // 1. 读取 API Key
  const apiKey = loadEnv()
  log('配置', `API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} 字符)`, c.green)

  // 2. 构造请求体（官方 HTTP 格式）
  const requestBody = {
    model: 'qwen3.6-plus',
    messages: [
      { role: 'user', content: '你好，请介绍一下你自己' }
    ]
  }

  // 3. 发送请求
  const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

  log('请求', `模型: qwen3.6-plus`, c.cyan)
  log('请求', `URL: ${url}`, c.cyan)
  log('请求', `方法: POST`, c.cyan)
  log('请求', `Header: Authorization: Bearer ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`, c.cyan)
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
        'Authorization': `Bearer ${apiKey}`,
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
    console.log(`${c.gray}${JSON.stringify(data, null, 2)}${c.reset}\n`)

    const content = data.choices?.[0]?.message?.content

    if (!content) {
      log('错误', 'AI 返回的内容为空', c.red)
      process.exit(1)
    }

    console.log(`${c.bold}AI 回复:${c.reset}`)
    console.log(`${c.green}${content}${c.reset}\n`)

    console.log(`${c.bold}${'='.repeat(60)}${c.reset}`)
    console.log(`${c.green}${c.bold}测试通过！Alibaba DashScope API 连接正常。${c.reset}`)
    console.log(`${c.bold}${'='.repeat(60)}\n`)

  } catch (error) {
    clearTimeout(timeoutId)
    const elapsed = Date.now() - startTime
    log('错误', `请求异常 (耗时 ${elapsed}ms)`, c.red)

    if (error.name === 'AbortError') {
      log('错误', `连接超时（超过 ${timeoutMs}ms）`, c.red)
      console.log(`\n${c.yellow}可能原因：${c.reset}`)
      console.log('  1. 网络连接问题')
      console.log('  2. dashscope.aliyuncs.com 无法访问')
    } else if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      log('错误', '底层连接超时', c.red)
      console.log(`\n${c.yellow}可能原因：${c.reset}`)
      console.log('  1. 本地网络无法访问 dashscope.aliyuncs.com')
      console.log('  2. DNS 解析失败')
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
