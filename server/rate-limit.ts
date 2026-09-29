import { LRUCache } from 'lru-cache'

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class RateLimiter {
  private cache: LRUCache<string, RateLimitEntry>
  private windowMs: number

  constructor(options?: { maxEntries?: number; windowMs?: number }) {
    this.windowMs = options?.windowMs ?? 60 * 60 * 1000 // default 1 hour
    this.cache = new LRUCache({
      max: options?.maxEntries ?? 500,
      ttl: this.windowMs,
    })
  }

  check(key: string, limit: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.cache.get(key)

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.windowMs
      this.cache.set(key, { count: 1, resetTime })
      return { allowed: true, remaining: limit - 1, resetTime }
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime }
    }

    entry.count++
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
  }
}

/**
 * AI 识别专用限流器
 * - 窗口期：1 小时
 * - 已登录用户：20 次/小时
 * - 未登录用户（按 IP）：5 次/小时
 */
export const aiRateLimiter = new RateLimiter({
  maxEntries: 1000,
  windowMs: 60 * 60 * 1000,
})
