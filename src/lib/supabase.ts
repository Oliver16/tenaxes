import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let _supabase: SupabaseClient<Database> | null = null

function getSupabase(): SupabaseClient<Database> {
  if (_supabase) {
    return _supabase
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

  return _supabase
}

// Create a Proxy that lazily initializes the client
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabase()
    return (client as any)[prop]
  }
})

export type Profile = {
  id: string
  email: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
  roles?: Role[]  // Populated from user_roles join
}

export type Role = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type UserRole = {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by: string | null
  role?: Role  // Populated from join
}

export type SurveyResponse = {
  id?: string
  session_id: string
  user_id?: string | null
  responses: Record<number, number>
  created_at?: string
}

export type SurveyResult = {
  id?: string
  session_id: string
  user_id?: string | null
  core_axes: AxisScore[]
  facets: AxisScore[]
  top_flavors: FlavorMatch[]
  created_at?: string
}

export type AxisScore = {
  axis_id: string
  name: string
  score: number
  pole_negative: string
  pole_positive: string
  pole_label: string
}

export type FlavorMatch = {
  flavor_id: string
  name: string
  affinity: number
  match_strength: string
  description: string
  color: string
}
