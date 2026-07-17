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
          description: string | null
          pole_negative: string | null
          pole_positive: string | null
          family: string
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          pole_negative?: string | null
          pole_positive?: string | null
          family: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          pole_negative?: string | null
          pole_positive?: string | null
          family?: string
          created_at?: string | null
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
          bank_version: string
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
          bank_version?: string
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
          bank_version?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_axis_id_fkey"
            columns: ["axis_id"]
            isOneToOne: false
            referencedRelation: "axes"
            referencedColumns: ["id"]
          }
        ]
      }
      question_axis_links: {
        Row: {
          id: number
          question_id: number
          axis_id: string
          role: string
          axis_key: number
          weight: number
          created_at: string | null
        }
        Insert: {
          id?: number
          question_id: number
          axis_id: string
          role: string
          axis_key: number
          weight?: number
          created_at?: string | null
        }
        Update: {
          id?: number
          question_id?: number
          axis_id?: string
          role?: string
          axis_key?: number
          weight?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_axis_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_axis_links_axis_id_fkey"
            columns: ["axis_id"]
            isOneToOne: false
            referencedRelation: "axes"
            referencedColumns: ["id"]
          }
        ]
      }
      survey_responses: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          bank_version: string
          responses: Json
          question_order: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          bank_version?: string
          responses: Json
          question_order?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          bank_version?: string
          responses?: Json
          question_order?: number[] | null
          created_at?: string
        }
        Relationships: []
      }
      question_metadata: {
        Row: {
          question_id: number
          bank_version: string
          policy_domain: string
          latent_conflict: string | null
          actor_level: string | null
          policy_instrument: string | null
          scenario_conditions: string | null
          item_family: string
          collision_pair: string | null
          created_at: string | null
        }
        Insert: {
          question_id: number
          bank_version: string
          policy_domain: string
          latent_conflict?: string | null
          actor_level?: string | null
          policy_instrument?: string | null
          scenario_conditions?: string | null
          item_family: string
          collision_pair?: string | null
          created_at?: string | null
        }
        Update: {
          question_id?: number
          bank_version?: string
          policy_domain?: string
          latent_conflict?: string | null
          actor_level?: string | null
          policy_instrument?: string | null
          scenario_conditions?: string | null
          item_family?: string
          collision_pair?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_metadata_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          }
        ]
      }
      question_bank_versions: {
        Row: {
          id: string
          name: string
          notes: string | null
          question_count: number | null
          collision_count: number | null
          status: string
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          notes?: string | null
          question_count?: number | null
          collision_count?: number | null
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          notes?: string | null
          question_count?: number | null
          collision_count?: number | null
          status?: string
          created_at?: string | null
        }
        Relationships: []
      }
      result_ai_analyses: {
        Row: {
          id: string
          session_id: string
          parent_analysis_id: string | null
          user_id: string | null
          stage: string
          status: string
          provider: string
          model: string
          prompt_version: string
          schema_version: string
          bank_version: string | null
          input_hash: string
          context_json: Json
          deterministic_signals: Json
          analysis_json: Json | null
          error_code: string | null
          error_message: string | null
          input_tokens: number | null
          output_tokens: number | null
          latency_ms: number | null
          provider_request_id: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          parent_analysis_id?: string | null
          user_id?: string | null
          stage: string
          status: string
          provider: string
          model: string
          prompt_version: string
          schema_version: string
          bank_version?: string | null
          input_hash: string
          context_json?: Json
          deterministic_signals?: Json
          analysis_json?: Json | null
          error_code?: string | null
          error_message?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          provider_request_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          parent_analysis_id?: string | null
          user_id?: string | null
          stage?: string
          status?: string
          provider?: string
          model?: string
          prompt_version?: string
          schema_version?: string
          bank_version?: string | null
          input_hash?: string
          context_json?: Json
          deterministic_signals?: Json
          analysis_json?: Json | null
          error_code?: string | null
          error_message?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          latency_ms?: number | null
          provider_request_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_ai_analyses_parent_analysis_id_fkey"
            columns: ["parent_analysis_id"]
            isOneToOne: false
            referencedRelation: "result_ai_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_ai_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_results"
            referencedColumns: ["session_id"]
          }
        ]
      }
      survey_results: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          bank_version: string
          scores: Json | null
          conceptual_scores: Json | null
          applied_scores: Json | null
          collision_pairs: Json | null
          responses: Json | null
          core_axes: Json | null
          facets: Json | null
          top_flavors: Json | null
          response_coverage: Json | null
          not_sure_count: number
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          bank_version?: string
          scores?: Json | null
          conceptual_scores?: Json | null
          applied_scores?: Json | null
          collision_pairs?: Json | null
          responses?: Json | null
          core_axes?: Json | null
          facets?: Json | null
          top_flavors?: Json | null
          response_coverage?: Json | null
          not_sure_count?: number
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          bank_version?: string
          scores?: Json | null
          conceptual_scores?: Json | null
          applied_scores?: Json | null
          collision_pairs?: Json | null
          responses?: Json | null
          core_axes?: Json | null
          facets?: Json | null
          top_flavors?: Json | null
          response_coverage?: Json | null
          not_sure_count?: number
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

// 'collision' is the legacy role name; pre-migration rows are treated as
// 'tradeoff' by the tension analyzer and excluded from axis scoring.
export type QuestionAxisLinkRole = 'primary' | 'secondary' | 'tradeoff' | 'collision'

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

export interface AxisMeta {
  id: string
  name: string
  pole_negative?: string | null
  pole_positive?: string | null
}

/** One side of a value tension: a specific pole of a specific axis. */
export interface TensionSide {
  axis_id: string
  axis_name: string
  pole: -1 | 1
  label: string
}

/**
 * A value tension between two poles of different axes, measured from
 * tradeoff questions that force the respondent to rank one against the
 * other. `lean` is in [-1, 1]; positive means side_a's value prevailed.
 */
export interface TensionScore {
  pair_key: string
  axis_a: string
  axis_b: string
  signature: -1 | 1
  side_a: TensionSide
  side_b: TensionSide
  lean: number
  wins_a: number
  wins_b: number
  neutral_count: number
  answered_count: number
  question_count: number
  preference_strength: 'weak' | 'moderate' | 'strong' | 'very strong'
  classification: 'consistent_priority' | 'context_dependent' | 'balanced'
  confidence_level: 'low' | 'medium' | 'high'
  ideals: {
    /** Conceptual-score support for each side's pole (-1..1), if available. */
    side_a_support: number | null
    side_b_support: number | null
    /** Both values are conceptually endorsed - the scenarios forced a real ranking. */
    genuine_dilemma: boolean
    /** The side that LOST in scenarios despite stronger stated support, if any. */
    contradicts_ideals: 'side_a' | 'side_b' | null
  }
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

/**
 * v2.1 response encoding:
 * - missing key: unanswered / unvisited
 * - null: explicitly "Not sure / need more information" — excluded from
 *   scoring numerator AND denominator
 * - 0: "Neither / genuinely balanced" — an answered response that counts
 *   toward axis coverage
 * - ±1, ±2: directional answers
 * Never coerce null to zero (no `response || 0`).
 */
export type ScoredResponse = -2 | -1 | 0 | 1 | 2
export type SurveyResponse = ScoredResponse | null
export type ResponsesMap = Record<number, SurveyResponse | number>

/** Per-axis answer coverage stored on survey_results.response_coverage. */
export interface AxisCoverage {
  axis_id: string
  answered_primary_items: number
  available_primary_items: number
  answered_weight: number
  available_weight: number
  /** answered primary weight / available primary weight, in [0, 1]. */
  coverage: number
  confidence: 'high' | 'moderate' | 'low' | 'insufficient'
}
