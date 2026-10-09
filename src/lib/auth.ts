import { supabase } from './supabase'
import type { Database } from './database.types'

export type User = {
  id: string
  email: string
  created_at?: string
}

/**
 * Where the magic link should land. Defaults to the page the user is on
 * (so e.g. a results page can auto-link the result after sign-in) rather
 * than the site root.
 *
 * NOTE: Supabase only honors this URL if it matches the project's
 * Authentication > URL Configuration > Redirect URLs allow-list;
 * otherwise it silently falls back to the project's Site URL. See
 * SETUP_AUTH.md for the required dashboard configuration.
 */
function magicLinkRedirectTo(): string | undefined {
  return typeof window !== 'undefined' ? window.location.href : undefined
}

/**
 * Sign up a new user with email (magic link)
 */
export async function signUpWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: magicLinkRedirectTo(),
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
      emailRedirectTo: magicLinkRedirectTo(),
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
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    // Handle auth errors gracefully (e.g., AuthSessionMissingError)
    return null
  }
}

/**
 * Get or create user profile in public.profiles table
 */
export async function getOrCreateUserProfile(userId: string, email: string) {
  // First try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    return { success: true, data: existingProfile }
  }

  // If doesn't exist, create new profile
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({ id: userId, email } as any)
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
  } as any)

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
  } as any)

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
