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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      discount_codes: {
        Row: {
          active: boolean
          amount: number
          code: string
          created_at: string | null
          id: string
          max_uses: number | null
          partner_id: string
          type: string
          used_count: number
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          amount: number
          code: string
          created_at?: string | null
          id?: string
          max_uses?: number | null
          partner_id: string
          type: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          code?: string
          created_at?: string | null
          id?: string
          max_uses?: number | null
          partner_id?: string
          type?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_type: string
          id: number
          lead_id: string | null
          meta: Json | null
          partner_id: string
          session_id: string | null
          shop_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: never
          lead_id?: string | null
          meta?: Json | null
          partner_id: string
          session_id?: string | null
          shop_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: never
          lead_id?: string | null
          meta?: Json | null
          partner_id?: string
          session_id?: string | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: Json | null
          complete_flow_data: Json | null
          confirmation_email_opened_at: string | null
          confirmation_email_sent_at: string | null
          confirmation_id: string
          created_at: string | null
          deferred_completed_at: string | null
          deferred_token: string | null
          discount_code: string | null
          email: string
          first_name: string
          iban: string | null
          id: string
          ip_address: unknown
          june_contract_id: number | null
          june_synced_at: string | null
          landing_url: string | null
          last_name: string
          locale: string
          partner_id: string
          phone: string | null
          referrer: string | null
          sales_rep_id: string | null
          shop_id: string | null
          status: string
          tc_accepted_at: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          address?: Json | null
          complete_flow_data?: Json | null
          confirmation_email_opened_at?: string | null
          confirmation_email_sent_at?: string | null
          confirmation_id?: string
          created_at?: string | null
          deferred_completed_at?: string | null
          deferred_token?: string | null
          discount_code?: string | null
          email: string
          first_name: string
          iban?: string | null
          id?: string
          ip_address?: unknown
          june_contract_id?: number | null
          june_synced_at?: string | null
          landing_url?: string | null
          last_name: string
          locale: string
          partner_id: string
          phone?: string | null
          referrer?: string | null
          sales_rep_id?: string | null
          shop_id?: string | null
          status?: string
          tc_accepted_at: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          address?: Json | null
          complete_flow_data?: Json | null
          confirmation_email_opened_at?: string | null
          confirmation_email_sent_at?: string | null
          confirmation_id?: string
          created_at?: string | null
          deferred_completed_at?: string | null
          deferred_token?: string | null
          discount_code?: string | null
          email?: string
          first_name?: string
          iban?: string | null
          id?: string
          ip_address?: unknown
          june_contract_id?: number | null
          june_synced_at?: string | null
          landing_url?: string | null
          last_name?: string
          locale?: string
          partner_id?: string
          phone?: string | null
          referrer?: string | null
          sales_rep_id?: string | null
          shop_id?: string | null
          status?: string
          tc_accepted_at?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          accent_color: string
          active: boolean
          confirmation_email_body_i18n: Json
          confirmation_email_subject_i18n: Json
          created_at: string | null
          default_locale: string
          digest_partner_email: string | null
          flow_preset: string
          iban_behavior: string
          id: string
          locales_enabled: string[]
          logo_url: string | null
          name: string
          primary_color: string
          product_sold: string
          savings_sim_enabled: boolean
          slogan_i18n: Json
          slug: string
          tc_url_i18n: Json
          updated_at: string | null
        }
        Insert: {
          accent_color?: string
          active?: boolean
          confirmation_email_body_i18n?: Json
          confirmation_email_subject_i18n?: Json
          created_at?: string | null
          default_locale?: string
          digest_partner_email?: string | null
          flow_preset?: string
          iban_behavior?: string
          id?: string
          locales_enabled?: string[]
          logo_url?: string | null
          name: string
          primary_color?: string
          product_sold?: string
          savings_sim_enabled?: boolean
          slogan_i18n?: Json
          slug: string
          tc_url_i18n?: Json
          updated_at?: string | null
        }
        Update: {
          accent_color?: string
          active?: boolean
          confirmation_email_body_i18n?: Json
          confirmation_email_subject_i18n?: Json
          created_at?: string | null
          default_locale?: string
          digest_partner_email?: string | null
          flow_preset?: string
          iban_behavior?: string
          id?: string
          locales_enabled?: string[]
          logo_url?: string | null
          name?: string
          primary_color?: string
          product_sold?: string
          savings_sim_enabled?: boolean
          slogan_i18n?: Json
          slug?: string
          tc_url_i18n?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          partner_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          partner_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          partner_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          active: boolean
          created_at: string | null
          display_name: string
          email: string | null
          id: string
          shop_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          display_name: string
          email?: string | null
          id?: string
          shop_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_reps_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          name: string
          partner_id: string
          qr_token: string
          zip: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          partner_id: string
          qr_token?: string
          zip?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          partner_id?: string
          qr_token?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      funnel_30d: {
        Row: {
          count: number | null
          event_type: string | null
          partner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_daily_counts: {
        Row: {
          day: string | null
          leads: number | null
          partner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_partner_id: { Args: never; Returns: string }
      is_june_admin: { Args: never; Returns: boolean }
      is_partner_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
