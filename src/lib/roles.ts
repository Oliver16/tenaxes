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
  const { error } = await (supabase
    .from('user_roles') as any)
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
 * Uses API route with service role to bypass RLS restrictions
 */
export async function getAllUsersWithRoles(): Promise<(Profile & { roles: Role[] })[]> {
  try {
    const response = await fetch('/api/admin/users')

    if (!response.ok) {
      console.error('Error fetching users:', await response.text())
      return []
    }

    const users = await response.json()
    return users || []
  } catch (error) {
    console.error('Error fetching users with roles:', error)
    return []
  }
}

/**
 * Create a new role (admin only)
 */
export async function createRole(
  id: string,
  name: string,
  description?: string
): Promise<{ success: boolean; data?: Role; error?: string }> {
  const { data, error } = await (supabase
    .from('roles') as any)
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
  const { data, error } = await (supabase
    .from('roles') as any)
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
