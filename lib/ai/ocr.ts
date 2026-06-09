/**
 * Tesseract CLI OCR Service
 * 调用系统 Tesseract 命令行工具从图片中提取纯文本
 * 支持中文(简体) + 英文混合识别
 *
 * 依赖安装：
 *   Mac: brew install tesseract tesseract-lang
 *   Ubuntu/Debian: apt-get install -y tesseract-ocr tesseract-ocr-chi-sim
 */

import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { extractTextWithBaidu } from './baidu-ocr'
import { logger } from '@/lib/logger'

/**
 * 下载图片到临时文件
 */
async function downloadImageToTemp(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('gif')
      ? 'gif'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg'

  const tempPath = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(tempPath, buffer)

  return tempPath
}

/**
 * 调用 Tesseract CLI 识别图片
 */
function runTesseract(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tesseract', [imagePath, 'stdout', '-l', 'chi_sim+eng'])
    let output = ''
    let errorOutput = ''

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString('utf-8')
    })

    proc.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString('utf-8')
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`Tesseract 退出码 ${code}: ${errorOutput}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Tesseract 启动失败: ${err.message}`))
    })
  })
}

/**
 * 从图片 URL 提取纯文本
 * 优先使用百度 OCR，失败时回退到 Tesseract CLI
 * @param imageUrl 图片公开 URL
 * @returns 提取的纯文本
 */
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  const log = logger('OCR')

  // 优先尝试百度 OCR（中文识别率更高）
  try {
    log.step('1. 开始百度OCR识别')
    const text = await extractTextWithBaidu(imageUrl)
    log.step(`2. 百度OCR完成, 字数: ${text.length}`)
    return text
  } catch (baiduError) {
    log.step('1. 百度OCR失败，回退到 Tesseract')
    console.warn('[OCR] 百度OCR失败:', baiduError)
    // 继续执行 Tesseract 回退逻辑
  }

  // 回退：Tesseract CLI
  let tempPath: string | null = null

  try {
    log.step('2. 下载图片到临时文件')
    tempPath = await downloadImageToTemp(imageUrl)
    log.step(`3. 图片已下载到: ${tempPath}`)

    log.step('4. 开始 Tesseract OCR 识别')
    const text = await runTesseract(tempPath)
    log.step(`5. Tesseract完成, 字数: ${text.length}`)

    if (!text || text.trim().length === 0) {
      throw new Error('未识别到文字内容')
    }

    log.done('OCR完成')
    return text.trim()
  } catch (error) {
    log.error('OCR失败', error)

    if (error instanceof Error) {
      if (error.message.includes('tesseract')) {
        throw error
      }
      if (error.message.includes('下载图片失败')) {
        throw error
      }
    }
    throw new Error('OCR 识别失败，请重试')
  } finally {
    if (tempPath) {
      log.step('6. 删除临时文件')
      fs.unlink(tempPath).catch(() => {
        // 忽略删除失败
      })
    }
  }
}
