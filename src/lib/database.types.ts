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
      }
      survey_results: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          core_axes: Json
          facets: Json
          top_flavors: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          core_axes: Json
          facets: Json
          top_flavors: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          core_axes?: Json
          facets?: Json
          top_flavors?: Json
          created_at?: string
        }
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
