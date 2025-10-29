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
          role: 'applicant' | 'reviewer'
          industry: string | null
          quick_context: string | null
          roast_preferences: string[]
          roast_count: number
          is_available: boolean
          email: string | null
          name: string | null
          company: string | null
          yc_batch: string | null
          linkedin: string | null
          x_twitter: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'applicant' | 'reviewer'
          industry?: string | null
          quick_context?: string | null
          roast_preferences?: string[]
          roast_count?: number
          is_available?: boolean
          email?: string | null
          name?: string | null
          company?: string | null
          yc_batch?: string | null
          linkedin?: string | null
          x_twitter?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'applicant' | 'reviewer'
          industry?: string | null
          quick_context?: string | null
          roast_preferences?: string[]
          roast_count?: number
          is_available?: boolean
          email?: string | null
          name?: string | null
          company?: string | null
          yc_batch?: string | null
          linkedin?: string | null
          x_twitter?: string | null
          created_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          applicant_id: string
          reviewer_id: string
          roast_type: 'application' | 'pitch' | 'idea'
          status: 'requested' | 'accepted' | 'completed' | 'cancelled'
          meeting_link: string | null
          notes: string | null
          feedback_helpful: boolean | null
          requested_at: string
          scheduled_for: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          applicant_id: string
          reviewer_id: string
          roast_type: 'application' | 'pitch' | 'idea'
          status?: 'requested' | 'accepted' | 'completed' | 'cancelled'
          meeting_link?: string | null
          notes?: string | null
          feedback_helpful?: boolean | null
          requested_at?: string
          scheduled_for?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          applicant_id?: string
          reviewer_id?: string
          roast_type?: 'application' | 'pitch' | 'idea'
          status?: 'requested' | 'accepted' | 'completed' | 'cancelled'
          meeting_link?: string | null
          notes?: string | null
          feedback_helpful?: boolean | null
          requested_at?: string
          scheduled_for?: string | null
          completed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}