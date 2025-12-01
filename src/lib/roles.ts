import { supabase } from './supabase'
import type { Role, UserRole, Profile } from './supabase'

/**
 * Get all available roles
 */
export async function getAllRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching roles:', error)
    return []
  }

  return data || []
}

/**
 * Get a user's roles
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user roles:', error)
    return []
  }

  return (data || [])
    .map((ur: any) => ur.roles)
    .filter(Boolean)
}

/**
 * Check if a user has a specific role
 */
export async function hasRole(userId: string, roleId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .single()

  if (error) {
    return false
  }

  return !!data
}

/**
 * Check if a user is an admin (has 'admin' role)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'admin')
}

/**
 * Check if a user is a moderator (has 'moderator' or 'admin' role)
 */
export async function isModerator(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
    .in('role_id', ['admin', 'moderator'])

  if (error) {
    return false
  }

  return (data || []).length > 0
}

/**
 * Assign a role to a user
 * Only admins can call this
 */
export async function assignRole(
  userId: string,
  roleId: string,
  assignedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy || null
    })

  if (error) {
    console.error('Error assigning role:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Remove a role from a user
 * Only admins can call this
 */
export async function removeRole(
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)

  if (error) {
    console.error('Error removing role:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all users with their roles (for admin management)
 */
export async function getAllUsersWithRoles(): Promise<(Profile & { roles: Role[] })[]> {
  // First get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return []
  }

  if (!profiles || profiles.length === 0) {
    return []
  }

  // Get all user roles
  const { data: userRoles, error: rolesError } = await supabase
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
    return profiles.map(p => ({ ...p, roles: [] }))
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
  return profiles.map(profile => ({
    ...profile,
    roles: rolesByUser[profile.id] || []
  }))
}

/**
 * Create a new role (admin only)
 */
export async function createRole(
  id: string,
  name: string,
  description?: string
): Promise<{ success: boolean; data?: Role; error?: string }> {
  const { data, error } = await supabase
    .from('roles')
    .insert({
      id,
      name,
      description: description || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating role:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Update a role (admin only)
 */
export async function updateRole(
  id: string,
  updates: { name?: string; description?: string }
): Promise<{ success: boolean; data?: Role; error?: string }> {
  const { data, error } = await supabase
    .from('roles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating role:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Delete a role (admin only)
 */
export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting role:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
