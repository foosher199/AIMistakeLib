// 腾讯云开发数据库配置和结构说明

/**
 * 腾讯云开发 (TCB) 数据库说明
 * 
 * TCB 使用 MongoDB 作为底层数据库，无需手动创建表（集合）
 * 当你第一次向集合写入数据时，集合会自动创建
 * 
 * 需要手动配置的：
 * 1. 在腾讯云控制台开启匿名登录
 * 2. 设置数据库权限（推荐：所有用户可读，仅创建者可写）
 */

// 集合名称
export const COLLECTIONS = {
  QUESTIONS: 'questions',  // 错题集合
  USERS: 'users',          // 用户信息集合
} as const;

/**
 * questions 集合结构（自动创建）
 * 
 * 字段说明：
 * - _id: 自动生成的唯一ID
 * - _openid: 用户唯一标识（TCB 自动添加）
 * - content: 题目内容（字符串）
 * - subject: 学科ID（字符串，如 'math', 'chinese'）
 * - category: 知识点分类（字符串）
 * - difficulty: 难度（字符串：'easy' | 'medium' | 'hard'）
 * - answer: 答案（字符串）
 * - userAnswer: 用户答案（字符串，可选）
 * - explanation: 解析（字符串，可选）
 * - reviewCount: 复习次数（数字，默认 0）
 * - isMastered: 是否已掌握（布尔值，默认 false）
 * - lastReviewed: 上次复习时间（日期，可选）
 * - createdAt: 创建时间（日期）
 * - updatedAt: 更新时间（日期）
 * 
 * 示例文档：
 * {
 *   _id: 'xxx',
 *   _openid: 'user-xxx',
 *   content: '已知函数 f(x) = x² - 2x + 1，求 f(2) 的值。',
 *   subject: 'math',
 *   category: '函数',
 *   difficulty: 'medium',
 *   answer: '1',
 *   explanation: '将 x=2 代入函数...',
 *   reviewCount: 3,
 *   isMastered: true,
 *   lastReviewed: ISODate('2024-01-28T10:00:00Z'),
 *   createdAt: ISODate('2024-01-20T08:00:00Z'),
 *   updatedAt: ISODate('2024-01-28T10:00:00Z'),
 * }
 */

/**
 * users 集合结构（自动创建）
 * 
 * 字段说明：
 * - _id: 用户UID（与 TCB auth 的 uid 一致）
 * - username: 用户名
 * - email: 邮箱
 * - avatar: 头像URL
 * - createdAt: 创建时间
 * - updatedAt: 更新时间
 */

/**
 * 数据库权限设置（重要！）
 * 
 * 在腾讯云控制台 - 数据库 - 权限设置：
 * 
 * questions 集合：
 * {
 *   "read": true,  // 所有用户可读（用于自己的数据）
 *   "write": "auth.openid == doc._openid"  // 仅创建者可写
 * }
 * 
 * users 集合：
 * {
 *   "read": "auth.openid == doc._id",  // 仅自己可读
 *   "write": "auth.openid == doc._id"  // 仅自己可写
 * }
 */

/**
 * 索引建议（可选，提升查询性能）
 * 
 * questions 集合：
 * - _openid（自动创建）
 * - subject（用于按学科筛选）
 * - difficulty（用于按难度筛选）
 * - isMastered（用于筛选已掌握/待复习）
 * - createdAt（用于排序）
 */

// 数据库初始化函数（首次使用时自动创建集合）
export async function initDatabase(_app: any) {
  try {
    // TCB 的 add 操作会自动创建集合，无需手动创建
    console.log('Database initialized');
    
    return true;
  } catch (error) {
    console.error('Database init failed:', error);
    return false;
  }
}
