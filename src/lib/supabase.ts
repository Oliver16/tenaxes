import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SurveyResponse = {
  id?: string
  session_id: string
  responses: Record<number, number>
  created_at?: string
}

export type SurveyResult = {
  id?: string
  session_id: string
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
