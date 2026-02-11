/**
 * Questions API - Statistics
 *
 * GET /api/questions/stats - 获取统计信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/questions/stats
 *
 * 响应：
 * {
 *   stats: {
 *     total: number,
 *     mastered: number,
 *     pending: number
 *   }
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 验证用户登录
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS 自动过滤 user_id
    // 获取总数
    const { count: total, error: totalError } = await supabase
      .from('mistake_questions')
      .select('*', { count: 'exact', head: true })

    // 获取已掌握数量
    const { count: mastered, error: masteredError } = await supabase
      .from('mistake_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_mastered', true)

    if (totalError || masteredError) {
      console.error('Supabase stats error:', totalError || masteredError)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const stats = {
      total: total ?? 0,
      mastered: mastered ?? 0,
      pending: (total ?? 0) - (mastered ?? 0),
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('GET /api/questions/stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
