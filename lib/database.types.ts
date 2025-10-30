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
          featured_until: string | null
          last_featured: string | null
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
          featured_until?: string | null
          last_featured?: string | null
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
          featured_until?: string | null
          last_featured?: string | null
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
          accepted_at: string | null
          expires_at: string | null
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
          accepted_at?: string | null
          expires_at?: string | null
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
          accepted_at?: string | null
          expires_at?: string | null
          scheduled_for?: string | null
          completed_at?: string | null
        }
      }
      request_tracking: {
        Row: {
          id: string
          applicant_id: string
          date: string
          request_count: number
          last_rejection_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          applicant_id: string
          date: string
          request_count?: number
          last_rejection_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          applicant_id?: string
          date?: string
          request_count?: number
          last_rejection_at?: string | null
          created_at?: string
        }
      }
      request_history: {
        Row: {
          id: string
          applicant_id: string
          reviewer_id: string
          requested_at: string
        }
        Insert: {
          id?: string
          applicant_id: string
          reviewer_id: string
          requested_at?: string
        }
        Update: {
          id?: string
          applicant_id?: string
          reviewer_id?: string
          requested_at?: string
        }
      }
      live_sessions: {
        Row: {
          id: string
          reviewer_id: string
          started_at: string
          ends_at: string
          max_queue_size: number
          current_queue_size: number
          status: 'active' | 'paused' | 'ended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          started_at?: string
          ends_at: string
          max_queue_size?: number
          current_queue_size?: number
          status?: 'active' | 'paused' | 'ended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          started_at?: string
          ends_at?: string
          max_queue_size?: number
          current_queue_size?: number
          status?: 'active' | 'paused' | 'ended'
          created_at?: string
          updated_at?: string
        }
      }
      queue_entries: {
        Row: {
          id: string
          live_session_id: string
          applicant_id: string
          position: number
          status: 'waiting' | 'your_turn' | 'skipped' | 'joined' | 'completed'
          notified_at: string | null
          joined_at: string | null
          completed_at: string | null
          meeting_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          live_session_id: string
          applicant_id: string
          position: number
          status?: 'waiting' | 'your_turn' | 'skipped' | 'joined' | 'completed'
          notified_at?: string | null
          joined_at?: string | null
          completed_at?: string | null
          meeting_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          live_session_id?: string
          applicant_id?: string
          position?: number
          status?: 'waiting' | 'your_turn' | 'skipped' | 'joined' | 'completed'
          notified_at?: string | null
          joined_at?: string | null
          completed_at?: string | null
          meeting_id?: string | null
          created_at?: string
          updated_at?: string
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