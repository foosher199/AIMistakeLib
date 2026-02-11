/**
 * Supabase Browser Client
 * 仅用于客户端组件（'use client'）
 */

import { createBrowserClient as createBrowserSupabaseClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * 浏览器客户端
 */
export function createBrowserClient() {
  return createBrowserSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
