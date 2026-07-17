import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Profile, Role } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type UserWithRoles = Profile & { roles: Role[] }

export async function GET() {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  try {
    // Fetch all profiles using service role (bypasses RLS)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    // Fetch all user roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        roles (
          id,
          name,
          description,
          created_at
        )
      `)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      // Return profiles without roles if roles fetch fails
      return NextResponse.json(
        profiles.map((p: any) => ({ ...p, roles: [] }))
      )
    }

    // Group roles by user
    const rolesByUser: Record<string, Role[]> = {}
    ;(userRoles || []).forEach((ur: any) => {
      if (!rolesByUser[ur.user_id]) {
        rolesByUser[ur.user_id] = []
      }
      if (ur.roles) {
        rolesByUser[ur.user_id].push(ur.roles)
      }
    })

    // Combine profiles with their roles
    const usersWithRoles: UserWithRoles[] = profiles.map((profile: any) => ({
      ...profile,
      roles: rolesByUser[profile.id] || []
    }))

    return NextResponse.json(usersWithRoles)
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const roleMutationSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().trim().min(1).max(50),
  action: z.enum(['assign', 'remove'])
})

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const parsed = roleMutationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role change request' }, { status: 400 })
  }

  const { userId, roleId, action } = parsed.data

  // Do not allow an administrator to accidentally remove their own last path
  // back into the admin area.
  if (action === 'remove' && roleId === 'admin' && userId === auth.user.id) {
    return NextResponse.json(
      { error: 'You cannot remove your own admin role' },
      { status: 409 }
    )
  }

  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .maybeSingle()

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  const mutation = action === 'assign'
    ? supabaseAdmin.from('user_roles').upsert({
        user_id: userId,
        role_id: roleId,
        assigned_by: auth.user.id
      }, { onConflict: 'user_id,role_id' })
    : supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId)

  const { error } = await mutation
  if (error) {
    console.error('Failed to change user role:', error)
    return NextResponse.json({ error: 'Failed to change user role' }, { status: 500 })
  }

  // profiles.is_admin remains in the schema and in older RLS policies. Keep it
  // synchronized until those consumers have all migrated to role checks.
  if (roleId === 'admin') {
    const { error: syncError } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: action === 'assign', updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (syncError) {
      console.error('Failed to synchronize legacy admin flag:', syncError)
      return NextResponse.json({ error: 'Role changed but admin flag synchronization failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
