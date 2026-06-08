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
  const startTime = Date.now()

  // 优先尝试百度 OCR（中文识别率更高）
  try {
    const text = await extractTextWithBaidu(imageUrl)
    console.log(
      `[OCR] 百度OCR识别完成, 总耗时: ${Date.now() - startTime}ms, 字数: ${text.length}`
    )
    return text
  } catch (baiduError) {
    console.warn('[OCR] 百度OCR失败，回退到 Tesseract:', baiduError)
    // 继续执行 Tesseract 回退逻辑
  }

  // 回退：Tesseract CLI
  let tempPath: string | null = null

  try {
    tempPath = await downloadImageToTemp(imageUrl)
    const text = await runTesseract(tempPath)

    console.log(
      `[OCR] Tesseract识别完成, 总耗时: ${Date.now() - startTime}ms, 字数: ${text.length}`
    )

    if (!text || text.trim().length === 0) {
      throw new Error('未识别到文字内容')
    }

    return text.trim()
  } catch (error) {
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
      fs.unlink(tempPath).catch(() => {
        // 忽略删除失败
      })
    }
  }
}
