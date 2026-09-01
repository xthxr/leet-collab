// Database types for Supabase
// Keep in sync with supabase/migrations/001_initial.sql

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// Required by Supabase GenericTable
type NoRel = { Relationships: [] }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          leetcode_username: string | null
          leetcode_verified: boolean
          timezone: string
          email_nudges: boolean
          email_reminders: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          leetcode_username?: string | null
          leetcode_verified?: boolean
          timezone?: string
          email_nudges?: boolean
          email_reminders?: boolean
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          leetcode_username?: string | null
          leetcode_verified?: boolean
          timezone?: string
          email_nudges?: boolean
          email_reminders?: boolean
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          max_members: number
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          created_by: string
          max_members?: number
        }
        Update: {
          name?: string
          max_members?: number
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'owner' | 'member'
          is_active: boolean
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'member'
          is_active?: boolean
        }
        Update: {
          role?: 'owner' | 'member'
          is_active?: boolean
        }
        Relationships: []
      }
      group_streaks: {
        Row: {
          group_id: string
          current_streak: number
          longest_streak: number
          last_active_date: string | null
          broken_at: string | null
          total_days_active: number
          updated_at: string
        }
        Insert: {
          group_id: string
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          broken_at?: string | null
          total_days_active?: number
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          broken_at?: string | null
          total_days_active?: number
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          id: string
          group_id: string
          user_id: string
          activity_date: string
          verified_at: string
          submission_id: string | null
          problem_title: string | null
          problem_slug: string | null
          language: string | null
        }
        Insert: {
          group_id: string
          user_id: string
          activity_date?: string
          submission_id?: string | null
          problem_title?: string | null
          problem_slug?: string | null
          language?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      nudges: {
        Row: {
          id: string
          group_id: string
          from_user_id: string
          to_user_id: string
          nudge_type: 'manual' | 'auto'
          sent_date: string
          sent_at: string
        }
        Insert: {
          group_id: string
          from_user_id: string
          to_user_id: string
          nudge_type?: 'manual' | 'auto'
          sent_date?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      email_queue: {
        Row: {
          id: string
          recipient_email: string
          subject: string
          html_body: string
          text_body: string | null
          status: 'pending' | 'sent' | 'failed' | 'skipped'
          email_type: 'nudge' | 'reminder' | 'system'
          attempts: number
          last_attempted: string | null
          scheduled_for: string
          sent_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          recipient_email: string
          subject: string
          html_body: string
          text_body?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'skipped'
          email_type?: 'nudge' | 'reminder' | 'system'
          scheduled_for?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'failed' | 'skipped'
          attempts?: number
          last_attempted?: string | null
          sent_at?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      streak_history: {
        Row: {
          id: string
          group_id: string
          event_type: 'extended' | 'broken' | 'started' | 'reset'
          streak_day: number
          event_date: string
          created_at: string
        }
        Insert: {
          group_id: string
          event_type: 'extended' | 'broken' | 'started' | 'reset'
          streak_day: number
          event_date?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalculate_group_streak: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      join_group_by_invite: {
        Args: { p_invite_code: string; p_user_id: string }
        Returns: Json
      }
      get_group_dashboard: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ============================================================
// App-level types (composed from DB types)
// ============================================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type GroupStreak = Database['public']['Tables']['group_streaks']['Row']
export type DailyActivity = Database['public']['Tables']['daily_activity']['Row']
export type Nudge = Database['public']['Tables']['nudges']['Row']
export type StreakHistory = Database['public']['Tables']['streak_history']['Row']

export interface MemberStatus {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  leetcode_username: string | null
  role: 'owner' | 'member'
  joined_at: string
  done_today: boolean
  nudged_today: boolean
}

export interface GroupDashboard {
  group: Group
  streak: GroupStreak | null
  members: MemberStatus[]
  today: string
}

export interface LeetCodeSubmission {
  id: string
  title: string
  titleSlug: string
  timestamp: string
  statusDisplay: string
  lang: string
}

export interface VerifySubmissionResult {
  verified: boolean
  submission?: LeetCodeSubmission
  error?: string
}

export interface JoinGroupResult {
  success?: boolean
  group_id?: string
  group_name?: string
  error?: string
  code?: 'NOT_FOUND' | 'ALREADY_MEMBER' | 'GROUP_FULL' | 'NOT_VERIFIED'
}
