import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Profile, Role } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type UserWithRoles = Profile & { roles: Role[] }

export async function GET() {
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
