export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      axes: {
        Row: {
          id: string
          name: string
          pole_negative: string | null
          pole_positive: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          pole_negative?: string | null
          pole_positive?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          pole_negative?: string | null
          pole_positive?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_at: string
          assigned_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_at?: string
          assigned_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          assigned_at?: string
          assigned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: number
          axis_id: string
          key: number
          text: string
          educational_content: string | null
          display_order: number
          active: boolean
          weight: number
          question_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          axis_id: string
          key: number
          text: string
          educational_content?: string | null
          display_order?: number
          active?: boolean
          weight?: number
          question_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          axis_id?: string
          key?: number
          text?: string
          educational_content?: string | null
          display_order?: number
          active?: boolean
          weight?: number
          question_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          responses: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          responses: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          responses?: Json
          created_at?: string
        }
        Relationships: []
      }
      survey_results: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          scores: Json | null
          conceptual_scores: Json | null
          applied_scores: Json | null
          collision_pairs: Json | null
          responses: Json | null
          core_axes: Json | null
          facets: Json | null
          top_flavors: Json | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          scores?: Json | null
          conceptual_scores?: Json | null
          applied_scores?: Json | null
          collision_pairs?: Json | null
          responses?: Json | null
          core_axes?: Json | null
          facets?: Json | null
          top_flavors?: Json | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          scores?: Json | null
          conceptual_scores?: Json | null
          applied_scores?: Json | null
          collision_pairs?: Json | null
          responses?: Json | null
          core_axes?: Json | null
          facets?: Json | null
          top_flavors?: Json | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_responses: {
        Row: {
          date: string | null
          count: number | null
        }
      }
      aggregate_scores: {
        Row: {
          axis_id: string | null
          axis_name: string | null
          avg_score: number | null
          std_dev: number | null
          sample_size: number | null
        }
      }
      popular_flavors: {
        Row: {
          flavor_name: string | null
          count: number | null
          avg_affinity: number | null
        }
      }
      questions_by_axis: {
        Row: {
          axis_id: string | null
          active_count: number | null
          inactive_count: number | null
          total_count: number | null
        }
      }
    }
    Functions: {
      get_user_results: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          session_id: string
          core_axes: Json
          facets: Json
          top_flavors: Json
          created_at: string
        }[]
      }
      link_result_to_user: {
        Args: {
          p_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Question = Database['public']['Tables']['questions']['Row']

export type QuestionAxisLinkRole = 'primary' | 'collision'

export interface QuestionAxisLink {
  id: number
  question_id: number
  axis_id: string
  role: QuestionAxisLinkRole
  axis_key: -1 | 1
  weight: number
  created_at?: string
}

export interface QuestionWithLinks extends Question {
  question_axis_links: QuestionAxisLink[]
}

export interface AxisScore {
  axis_id: string
  name: string
  score: number
  raw_sum: number
  total_weight: number
  confidence: number
  response_variance: number
}

export interface CollisionScore {
  axis_primary: string
  axis_collision: string
  primary_name: string
  collision_name: string
  score_primary: number
  score_collision: number
  preference_index: number
  preference_strength: 'weak' | 'moderate' | 'strong' | 'very strong'
  preference_direction: 'primary' | 'collision' | 'balanced'
  question_count: number
  confidence_level: 'low' | 'medium' | 'high'
  interestingness_score: number
}

export interface QuestionContribution {
  question_id: number
  response_value: number
  contributions: {
    axis_id: string
    raw_contribution: number
    normalized_contribution: number
  }[]
}

export type ResponsesMap = Record<number, number>
