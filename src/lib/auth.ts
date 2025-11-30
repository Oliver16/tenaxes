import { supabase } from './supabase'

export type User = {
  id: string
  email: string
  created_at?: string
}

/**
 * Sign up a new user with email (magic link)
 */
export async function signUpWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    }
  })

  if (error) {
    console.error('Sign up error:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Sign in an existing user with email (magic link)
 */
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    }
  })

  if (error) {
    console.error('Sign in error:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get or create user profile in public.users table
 */
export async function getOrCreateUserProfile(userId: string, email: string) {
  // First try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    return { success: true, data: existingProfile }
  }

  // If doesn't exist, create new profile
  const { data: newProfile, error: createError } = await supabase
    .from('users')
    .insert({ id: userId, email })
    .select()
    .single()

  if (createError) {
    console.error('Error creating user profile:', createError)
    return { success: false, error: createError.message }
  }

  return { success: true, data: newProfile }
}

/**
 * Link a survey result to the current user's account
 */
export async function linkResultToUser(sessionId: string, userId: string) {
  const { data, error } = await supabase.rpc('link_result_to_user', {
    p_session_id: sessionId,
    p_user_id: userId
  })

  if (error) {
    console.error('Error linking result to user:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get all results for a user
 */
export async function getUserResults(userId: string) {
  const { data, error } = await supabase.rpc('get_user_results', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error fetching user results:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}
