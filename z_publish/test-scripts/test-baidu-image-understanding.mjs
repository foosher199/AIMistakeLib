#!/usr/bin/env node
/**
 * Baidu 图像内容理解 API 本地测试脚本
 *
 * 用法:
 *   node scripts/test-baidu-image-understanding.mjs <图片路径> [问题]
 *
 * 示例:
 *   node scripts/test-baidu-image-understanding.mjs ~/Desktop/test.jpg "这张图片里有什么？"
 *   node scripts/test-baidu-image-understanding.mjs ./test.png "请描述这张图片"
 *   node scripts/test-baidu-image-understanding.mjs scripts/1.jpg
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

// 提交图像理解请求
async function submitImageUnderstanding(accessToken, imageBase64, question) {
  log('请求', '正在提交图像理解请求...', c.cyan)

  const url = 'https://aip.baidubce.com/rest/2.0/image-classify/v1/image-understanding/request'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${url}?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        image: imageBase64,
        question: question,
      }),
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()
    log('调试', `响应: ${responseText.slice(0, 200)}`, c.gray)

    if (!response.ok) {
      throw new Error(`提交请求失败: ${response.status} ${responseText}`)
    }

    const data = JSON.parse(responseText)

    if (data.error_code) {
      throw new Error(`API 错误: ${data.error_code} - ${data.error_msg}`)
    }

    if (!data.result?.task_id) {
      throw new Error(`提交请求未返回 task_id: ${responseText}`)
    }

    log('请求', `任务已提交，task_id: ${data.result.task_id}`, c.green)
    return data.result.task_id
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 获取理解结果
async function getImageUnderstandingResult(accessToken, taskId) {
  log('结果', `正在获取识别结果 (task_id: ${taskId})...`, c.cyan)

  const url = 'https://aip.baidubce.com/rest/2.0/image-classify/v1/image-understanding/get-result'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${url}?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        task_id: taskId,
      }),
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`获取结果失败: ${response.status} ${responseText}`)
    }

    const data = JSON.parse(responseText)

    if (data.error_code) {
      throw new Error(`API 错误: ${data.error_code} - ${data.error_msg}`)
    }

    return data.result
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 轮询获取结果
async function pollForResult(accessToken, taskId, maxRetries = 30) {
  // 先等待 2 秒再开始查询，因为百度处理需要时间
  log('等待', '提交成功，等待 2 秒后开始查询...', c.yellow)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await getImageUnderstandingResult(accessToken, taskId)

      if (!result) {
        log('等待', `结果为空，重试 (${i + 1}/${maxRetries})`, c.yellow)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

      log('调试', `ret_code: ${result.ret_code}, ret_msg: ${result.ret_msg}`, c.gray)

      if (result.ret_code === 0) {
        log('结果', `处理成功！`, c.green)
        return result
      }

      if (result.ret_code === 1) {
        log('等待', `处理中... (${i + 1}/${maxRetries})`, c.yellow)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

      throw new Error(`未知状态: ret_code=${result.ret_code}`)
    } catch (error) {
      // 如果是 task_id 无效的错误，可能需要等待更久
      if (error.message.includes('task_id 无效') || error.message.includes('282004')) {
        log('等待', `task_id 还未生效，等待 2 秒后重试... (${i + 1}/${maxRetries})`, c.yellow)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        continue
      }
      throw error
    }
  }

  throw new Error('处理超时，未能在规定时间内完成')
}

// 主函数
async function main() {
  const imgPath = process.argv[2]
  const question = process.argv[3] || '请详细描述这张图片的内容'

  if (!imgPath) {
    console.log(`
${c.bold}Baidu 图像内容理解 API 本地测试脚本${c.reset}

用法: node scripts/test-baidu-image-understanding.mjs <图片路径> [问题]

示例:
  node scripts/test-baidu-image-understanding.mjs ~/Desktop/test.jpg "这张图片里有什么？"
  node scripts/test-baidu-image-understanding.mjs ./test.png "请描述这张图片"
  node scripts/test-baidu-image-understanding.mjs scripts/1.jpg
`)
    process.exit(1)
  }

  const resolvedPath = path.resolve(imgPath)
  if (!fs.existsSync(resolvedPath)) {
    log('错误', `图片文件不存在: ${resolvedPath}`, c.red)
    process.exit(1)
  }

  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.bold}        Baidu 图像内容理解 API 连接测试${c.reset}`)
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
  log('问题', question, c.cyan)

  // 3. 获取 Access Token
  let accessToken
  try {
    accessToken = await getAccessToken(apiKey, secretKey)
  } catch (error) {
    log('错误', `获取 Access Token 失败: ${error.message}`, c.red)
    process.exit(1)
  }

  // 4. 提交图像理解请求
  let taskId
  try {
    taskId = await submitImageUnderstanding(accessToken, imgBase64, question)
  } catch (error) {
    log('错误', `提交请求失败: ${error.message}`, c.red)
    process.exit(1)
  }

  // 5. 轮询获取结果
  let result
  try {
    result = await pollForResult(accessToken, taskId)
  } catch (error) {
    log('错误', `获取结果失败: ${error.message}`, c.red)
    process.exit(1)
  }

  // 6. 输出结果
  console.log(`\n${c.bold}${'-'.repeat(60)}${c.reset}`)
  console.log(`${c.bold}识别结果:${c.reset}\n`)
  console.log(`${c.green}${result.description}${c.reset}\n`)

  console.log(`${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.green}${c.bold}测试通过！Baidu 图像内容理解 API 连接正常。${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)
}

main().catch((error) => {
  log('错误', `未处理的异常: ${error.message}`, c.red)
  console.log(`${c.bold}${'='.repeat(60)}${c.reset}`)
  console.log(`${c.red}${c.bold}测试失败。${c.reset}`)
  console.log(`${c.bold}${'='.repeat(60)}\n`)
  process.exit(1)
})
