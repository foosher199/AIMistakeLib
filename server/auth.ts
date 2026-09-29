/**
 * API Authentication Helper
 *
 * Provides authentication functions that support both:
 * - Bearer Token authentication (iOS/Android clients)
 * - Cookie authentication (Web clients)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createApiClient } from './supabase'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Auth result containing the supabase client and user
 */
export interface AuthResult {
  supabase: SupabaseClient
  user: User
}

/**
 * Get authenticated supabase client and user from request
 * Supports both Bearer Token (iOS/Android) and Cookie (Web) authentication
 */
export async function getAuthUser(request: NextRequest): Promise<AuthResult | null> {
  // 优先使用Bearer Token认证（iOS/Android），回退到Cookie认证（Web）
  let supabase = await createApiClient(request)
  let user: User | null = null

  if (supabase) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) {
    supabase = await createServerClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user || !supabase) {
    return null
  }

  return { supabase, user }
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await getAuthUser(request)

  if (!authResult) {
    throw new AuthError('Unauthorized')
  }

  return authResult
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Helper to create auth-aware route handler
 */
export function withAuth<HandlerArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: HandlerArgs) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: HandlerArgs): Promise<NextResponse> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      console.error('Route handler error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
