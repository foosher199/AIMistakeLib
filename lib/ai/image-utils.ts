/**
 * 图片工具函数
 * 用于服务端下载图片并转为 base64
 */

/**
 * 从 URL 下载图片并转为 base64
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 返回带 data URI 前缀的 base64
    return `data:${contentType};base64,${base64}`
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`图片下载失败: ${error.message}`)
    }
    throw new Error('图片下载失败')
  }
}
