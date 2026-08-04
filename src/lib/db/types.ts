export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          account_id: string
          all_day: boolean
          calendar_id: string
          color: string | null
          created_at: string
          description: string
          ends_at: string | null
          event_id: string
          id: string
          location: string
          recurring_id: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          updated_at_remote: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          all_day?: boolean
          calendar_id: string
          color?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          event_id: string
          id?: string
          location?: string
          recurring_id?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_at_remote?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          all_day?: boolean
          calendar_id?: string
          color?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          event_id?: string
          id?: string
          location?: string
          recurring_id?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_at_remote?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_links: {
        Row: {
          account_id: string
          calendar_id: string
          created_at: string
          etag: string | null
          event_id: string
          id: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          calendar_id: string
          created_at?: string
          etag?: string | null
          event_id: string
          id?: string
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          calendar_id?: string
          created_at?: string
          etag?: string | null
          event_id?: string
          id?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_links_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          id: string
          mood: number | null
          note: string
          sleep_quality: number | null
          stress: number | null
          updated_at: string
          user_id: string
          what_helped: string
          what_was_hard: string
        }
        Insert: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          mood?: number | null
          note?: string
          sleep_quality?: number | null
          stress?: number | null
          updated_at?: string
          user_id: string
          what_helped?: string
          what_was_hard?: string
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          mood?: number | null
          note?: string
          sleep_quality?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
          what_helped?: string
          what_was_hard?: string
        }
        Relationships: []
      }
      displays: {
        Row: {
          ambient: Json
          brightness: number
          created_at: string
          density: string
          id: string
          last_seen_at: string | null
          layout: Json
          motion: string
          name: string
          role: string
          theme: string | null
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          ambient?: Json
          brightness?: number
          created_at?: string
          density?: string
          id?: string
          last_seen_at?: string | null
          layout?: Json
          motion?: string
          name?: string
          role?: string
          theme?: string | null
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          ambient?: Json
          brightness?: number
          created_at?: string
          density?: string
          id?: string
          last_seen_at?: string | null
          layout?: Json
          motion?: string
          name?: string
          role?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          archived: boolean
          category: string
          created_at: string
          id: string
          is_default: boolean
          metrics: string[]
          name: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          metrics?: string[]
          name: string
          user_id: string
        }
        Update: {
          archived?: boolean
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          metrics?: string[]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_accounts: {
        Row: {
          created_at: string
          email: string
          external_id: string
          id: string
          is_active: boolean
          label: string
          meta: Json
          provider: string
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          external_id?: string
          id?: string
          is_active?: boolean
          label?: string
          meta?: Json
          provider: string
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          external_id?: string
          id?: string
          is_active?: boolean
          label?: string
          meta?: Json
          provider?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_secrets: {
        Row: {
          access_token: string
          account_id: string
          expires_at: string | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string
          account_id: string
          expires_at?: string | null
          refresh_token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_id?: string
          expires_at?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      nerf_content: {
        Row: {
          caption: string
          concept: string
          created_at: string
          cta: string
          format: string
          hook: string
          id: string
          link: string
          metrics: Json
          next_action: string
          notes: string
          platforms: string[]
          publish_date: string | null
          repurpose_status: string
          sort_order: number
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string
          concept?: string
          created_at?: string
          cta?: string
          format?: string
          hook?: string
          id?: string
          link?: string
          metrics?: Json
          next_action?: string
          notes?: string
          platforms?: string[]
          publish_date?: string | null
          repurpose_status?: string
          sort_order?: number
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          concept?: string
          created_at?: string
          cta?: string
          format?: string
          hook?: string
          id?: string
          link?: string
          metrics?: Json
          next_action?: string
          notes?: string
          platforms?: string[]
          publish_date?: string | null
          repurpose_status?: string
          sort_order?: number
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          body: string
          category: string
          id: string
          read_at: string | null
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category: string
          id?: string
          read_at?: string | null
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          id?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          category: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          app_name: string
          created_at: string
          display_name: string
          id: string
          onboarded_at: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          app_name?: string
          created_at?: string
          display_name?: string
          id: string
          onboarded_at?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          app_name?: string
          created_at?: string
          display_name?: string
          id?: string
          onboarded_at?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived: boolean
          color: string | null
          created_at: string
          custom_fields: Json
          description: string
          icon: string | null
          id: string
          kind: string
          milestones: Json
          name: string
          priority: number
          sort_order: number
          statuses: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          created_at?: string
          custom_fields?: Json
          description?: string
          icon?: string | null
          id?: string
          kind?: string
          milestones?: Json
          name: string
          priority?: number
          sort_order?: number
          statuses?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          created_at?: string
          custom_fields?: Json
          description?: string
          icon?: string | null
          id?: string
          kind?: string
          milestones?: Json
          name?: string
          priority?: number
          sort_order?: number
          statuses?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_label: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string
          endpoint: string
          id?: string
          keys?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: []
      }
      recovery_notes: {
        Row: {
          body_area: string
          created_at: string
          date: string
          id: string
          kind: string
          note: string
          severity: number | null
          user_id: string
        }
        Insert: {
          body_area?: string
          created_at?: string
          date?: string
          id?: string
          kind?: string
          note?: string
          severity?: number | null
          user_id: string
        }
        Update: {
          body_area?: string
          created_at?: string
          date?: string
          id?: string
          kind?: string
          note?: string
          severity?: number | null
          user_id?: string
        }
        Relationships: []
      }
      relationship_items: {
        Row: {
          created_at: string
          date: string | null
          done: boolean
          id: string
          kind: string
          note: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          done?: boolean
          id?: string
          kind?: string
          note?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          done?: boolean
          id?: string
          kind?: string
          note?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          at: string
          date: string
          id: string
          routine_id: string
          status: string
          user_id: string
        }
        Insert: {
          at?: string
          date?: string
          id?: string
          routine_id: string
          status?: string
          user_id: string
        }
        Update: {
          at?: string
          date?: string
          id?: string
          routine_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          category: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          schedule: Json
          slug: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          schedule?: Json
          slug?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          schedule?: Json
          slug?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selfcare_logs: {
        Row: {
          created_at: string
          date: string
          done: boolean
          id: string
          kind: string
          note: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          kind: string
          note?: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          kind?: string
          note?: string
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          checklist: Json
          completed_at: string | null
          created_at: string
          custom: Json
          deferral_count: number
          depends_on: string[]
          due_date: string | null
          duration_min: number | null
          energy: string | null
          id: string
          importance: number
          links: Json
          note: string
          priority_date: string | null
          priority_slot: number | null
          project_id: string | null
          scheduled_at: string | null
          scheduled_end_at: string | null
          recurrence: Json | null
          sort_order: number
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          custom?: Json
          deferral_count?: number
          depends_on?: string[]
          due_date?: string | null
          duration_min?: number | null
          energy?: string | null
          id?: string
          importance?: number
          links?: Json
          note?: string
          priority_date?: string | null
          priority_slot?: number | null
          project_id?: string | null
          scheduled_at?: string | null
          scheduled_end_at?: string | null
          recurrence?: Json | null
          sort_order?: number
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          custom?: Json
          deferral_count?: number
          depends_on?: string[]
          due_date?: string | null
          duration_min?: number | null
          energy?: string | null
          id?: string
          importance?: number
          links?: Json
          note?: string
          priority_date?: string | null
          priority_slot?: number | null
          project_id?: string | null
          scheduled_at?: string | null
          scheduled_end_at?: string | null
          recurrence?: Json | null
          sort_order?: number
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_entries: {
        Row: {
          created_at: string
          distance_m: number | null
          exercise_id: string | null
          exercise_name: string
          form_note: string
          hold_seconds: number | null
          id: string
          is_pr: boolean
          reps: number | null
          rpe: number | null
          session_id: string
          set_number: number
          time_seconds: number | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          distance_m?: number | null
          exercise_id?: string | null
          exercise_name?: string
          form_note?: string
          hold_seconds?: number | null
          id?: string
          is_pr?: boolean
          reps?: number | null
          rpe?: number | null
          session_id: string
          set_number?: number
          time_seconds?: number | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          distance_m?: number | null
          exercise_id?: string | null
          exercise_name?: string
          form_note?: string
          hold_seconds?: number | null
          id?: string
          is_pr?: boolean
          reps?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          time_seconds?: number | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          notes: string
          split: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string
          split?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string
          split?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
