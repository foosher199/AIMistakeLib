/**
 * Logger - 日志单例工具
 *
 * 使用方式：
 * ```ts
 * import { logger } from '@/lib/logger'
 *
 * // 在函数开头初始化
 * const log = logger.start('myFunction')
 *
 * log.step('1. 开始某操作')
 * // [myFunction] [0ms] 1. 开始某操作
 *
 * log.step('2. 完成')
 * // [myFunction] [5ms] 2. 完成
 *
 * log.done('操作完成，共处理 3 条数据')
 * // [myFunction] [10ms] 操作完成，共处理 3 条数据
 *
 * // 或者直接使用
 * logger.log('MyModule', '这是一条日志')
 * ```
 */

export interface LogStep {
  step: (message: string) => void
  done: (message?: string) => void
}

class Logger {
  private startTime: number
  private moduleName: string

  constructor(moduleName: string) {
    this.startTime = Date.now()
    this.moduleName = moduleName
  }

  /**
   * 记录一个步骤
   */
  step(message: string): void {
    const elapsed = Date.now() - this.startTime
    console.log(`[${this.moduleName}] [${elapsed}ms] ${message}`)
  }

  /**
   * 记录完成信息
   */
  done(message?: string): void {
    const elapsed = Date.now() - this.startTime
    if (message) {
      console.log(`[${this.moduleName}] [${elapsed}ms] ✓ ${message}`)
    } else {
      console.log(`[${this.moduleName}] [${elapsed}ms] ✓ 完成`)
    }
  }

  /**
   * 记录错误
   */
  error(message: string, error?: unknown): void {
    const elapsed = Date.now() - this.startTime
    console.error(`[${this.moduleName}] [${elapsed}ms] ✗ ${message}`, error ?? '')
  }

  /**
   * 获取总耗时
   */
  getElapsed(): number {
    return Date.now() - this.startTime
  }
}

/**
 * 创建带模块名称的日志记录器
 * @param moduleName 模块名称，会显示在日志前缀
 * @returns Logger 实例
 *
 * @example
 * ```ts
 * const log = logger.start('MyModule')
 * log.step('1. 开始')
 * // [MyModule] [0ms] 1. 开始
 *
 * log.done('完成')
 * // [MyModule] [100ms] ✓ 完成
 * ```
 */
export function logger(moduleName: string): Logger {
  return new Logger(moduleName)
}

/**
 * 快速日志记录
 * @param moduleName 模块名称
 * @param message 日志消息
 *
 * @example
 * ```ts
 * logger.log('MyModule', '这是一条信息')
 * // [MyModule] 这是一条信息
 * ```
 */
export function log(moduleName: string, message: string): void {
  console.log(`[${moduleName}] ${message}`)
}

/**
 * 快速错误记录
 * @param moduleName 模块名称
 * @param message 错误消息
 * @param error 错误对象（可选）
 *
 * @example
 * ```ts
 * logger.error('MyModule', '出错了', new Error('具体错误'))
 * // [MyModule] ✗ 出错了 Error: 具体错误
 * ```
 */
export function error(moduleName: string, message: string, err?: unknown): void {
  console.error(`[${moduleName}] ✗ ${message}`, err ?? '')
}
