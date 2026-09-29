import { NextRequest } from 'next/server'
import { createAdminClient, getAuthClient } from '@/server/supabase'

function configuredAdminIds() {
  return new Set(
    (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  )
}

export async function getAdminContext(request: NextRequest) {
  const auth = await getAuthClient(request)
  if (!auth || !configuredAdminIds().has(auth.user.id)) return null

  return {
    user: auth.user,
    admin: createAdminClient(),
  }
}
