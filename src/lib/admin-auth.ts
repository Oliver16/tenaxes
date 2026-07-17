import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type AdminContext =
  | { user: User; response?: never }
  | { user?: never; response: NextResponse }

/**
 * Authenticate an admin API request from the Supabase session cookie.
 *
 * The application historically used profiles.is_admin while newer screens also
 * use the admin role. During the transition either source grants access; role
 * mutations keep both sources synchronized.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const [{ data: profile, error: profileError }, { data: role, error: roleError }] =
    await Promise.all([
      supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
      supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role_id', 'admin')
        .maybeSingle()
    ])

  if (profileError || roleError) {
    console.error('Failed to resolve admin authorization', { profileError, roleError })
    return {
      response: NextResponse.json({ error: 'Unable to verify permissions' }, { status: 500 })
    }
  }

  if (!profile?.is_admin && !role) {
    return {
      response: NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
  }

  return { user }
}
