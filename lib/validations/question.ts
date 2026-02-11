/**
 * Question Validation Schemas
 *
 * 说明：使用 Zod 定义错题数据的验证规则
 * 用途：API 路由中验证请求数据，确保数据安全和完整性
 */

import { z } from 'zod'

/**
 * 学科枚举
 */
const subjectEnum = z.enum([
  'math',
  'chinese',
  'english',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'politics',
])

/**
 * 难度枚举
 */
const difficultyEnum = z.enum(['easy', 'medium', 'hard'])

/**
 * 创建错题 Schema
 *
 * 用途：POST /api/questions
 *
 * 验证规则：
 * - content: 必填，至少1个字符
 * - subject: 必填，9个学科之一
 * - category: 必填，至少1个字符
 * - difficulty: 必填，3个难度之一
 * - answer: 必填，至少1个字符
 * - user_answer: 可选字符串
 * - explanation: 可选字符串
 * - image_url: 可选URL格式或空字符串
 */
export const CreateQuestionSchema = z.object({
  content: z.string().min(1, '题目内容不能为空'),
  subject: subjectEnum.describe('学科ID'),
  category: z.string().min(1, '知识点分类不能为空'),
  difficulty: difficultyEnum.describe('难度级别'),
  answer: z.string().min(1, '答案不能为空'),
  user_answer: z.string().optional(),
  explanation: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
})

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>

/**
 * 更新错题 Schema
 *
 * 用途：PATCH /api/questions/[id]
 *
 * 特点：所有字段都是可选的（部分更新）
 */
export const UpdateQuestionSchema = z.object({
  content: z.string().min(1).optional(),
  subject: subjectEnum.optional(),
  category: z.string().min(1).optional(),
  difficulty: difficultyEnum.optional(),
  answer: z.string().min(1).optional(),
  user_answer: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  image_url: z.string().url().optional().or(z.literal('')).nullable(),
  review_count: z.number().int().min(0).optional(),
  is_mastered: z.boolean().optional(),
  last_reviewed: z.string().datetime().optional().nullable(),
})

export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>

/**
 * 查询错题 Schema
 *
 * 用途：GET /api/questions?subject=math&difficulty=easy
 *
 * 查询参数：
 * - subject: 可选，按学科筛选
 * - difficulty: 可选，按难度筛选
 * - is_mastered: 可选，按掌握状态筛选
 * - search: 可选，模糊搜索题目内容或分类
 * - limit: 可选，分页数量（默认50）
 * - offset: 可选，分页偏移（默认0）
 */
export const QueryQuestionsSchema = z.object({
  subject: subjectEnum.optional(),
  difficulty: difficultyEnum.optional(),
  is_mastered: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  search: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().min(1).max(1000)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
})

export type QueryQuestionsInput = z.infer<typeof QueryQuestionsSchema>

/**
 * UUID Schema
 *
 * 用途：验证错题 ID 格式
 */
export const UUIDSchema = z.string().uuid('无效的错题ID')

/**
 * 复习记录 Schema
 *
 * 用途：POST /api/questions/[id]/review
 *
 * 说明：目前不需要额外参数，仅记录复习时间
 */
export const ReviewQuestionSchema = z.object({
  // 可选：未来可扩展，如记录用户答案、用时等
})

export type ReviewQuestionInput = z.infer<typeof ReviewQuestionSchema>

/**
 * 标记掌握 Schema
 *
 * 用途：POST /api/questions/[id]/master
 *
 * 说明：目前不需要额外参数，直接标记为已掌握
 */
export const MasterQuestionSchema = z.object({
  // 可选：未来可扩展，如添加备注等
})

export type MasterQuestionInput = z.infer<typeof MasterQuestionSchema>

/**
 * 批量操作 Schema
 *
 * 用途：批量删除、批量标记掌握等
 */
export const BatchOperationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, '至少选择一道题目'),
})

export type BatchOperationInput = z.infer<typeof BatchOperationSchema>

/**
 * 辅助函数：解析并验证数据
 *
 * 用途：在 API 路由中快速验证数据
 *
 * 使用示例：
 * ```typescript
 * import { parseAndValidate, CreateQuestionSchema } from '@/lib/validations/question'
 *
 * export async function POST(request: Request) {
 *   const body = await request.json()
 *   const result = parseAndValidate(CreateQuestionSchema, body)
 *
 *   if (!result.success) {
 *     return Response.json({ error: result.error }, { status: 400 })
 *   }
 *
 *   const validatedData = result.data
 *   // 继续处理...
 * }
 * ```
 */
export function parseAndValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

/**
 * 辅助函数：格式化验证错误
 *
 * 用途：将 Zod 错误转换为用户友好的消息
 *
 * 使用示例：
 * ```typescript
 * import { formatValidationError } from '@/lib/validations/question'
 *
 * const result = schema.safeParse(data)
 * if (!result.success) {
 *   const errorMessage = formatValidationError(result.error)
 *   return Response.json({ error: errorMessage }, { status: 400 })
 * }
 * ```
 */
export function formatValidationError(error: z.ZodError): string {
  const firstError = error.issues[0]
  if (firstError) {
    return `${firstError.path.join('.')}: ${firstError.message}`
  }
  return '数据验证失败'
}

/**
 * 辅助函数：验证多个字段
 *
 * 用途：返回所有验证错误（而非仅第一个）
 */
export function formatAllValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return errors
}
