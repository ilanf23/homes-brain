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
      claim_tokens: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          home_id: string | null
          id: string
          pro_id: string | null
          record_id: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at: string
          home_id?: string | null
          id?: string
          pro_id?: string | null
          record_id?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          home_id?: string | null
          id?: string
          pro_id?: string | null
          record_id?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_tokens_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_tokens_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_tokens_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          claim_invited_at: string | null
          consent_at: string | null
          consent_ref: string | null
          created_at: string
          email: string | null
          home_id: string
          id: string
          name: string
          phone: string | null
          pro_id: string
        }
        Insert: {
          claim_invited_at?: string | null
          consent_at?: string | null
          consent_ref?: string | null
          created_at?: string
          email?: string | null
          home_id: string
          id?: string
          name: string
          phone?: string | null
          pro_id: string
        }
        Update: {
          claim_invited_at?: string | null
          consent_at?: string | null
          consent_ref?: string | null
          created_at?: string
          email?: string | null
          home_id?: string
          id?: string
          name?: string
          phone?: string | null
          pro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string
          home_id: string
          id: string
          label: string | null
          make: string | null
          model: string | null
          recall_checked_at: string | null
          recall_status: string
          serial: string | null
          source: string
          type: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          created_at?: string
          home_id: string
          id?: string
          label?: string | null
          make?: string | null
          model?: string | null
          recall_checked_at?: string | null
          recall_status?: string
          serial?: string | null
          source?: string
          type?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          created_at?: string
          home_id?: string
          id?: string
          label?: string | null
          make?: string | null
          model?: string | null
          recall_checked_at?: string | null
          recall_status?: string
          serial?: string | null
          source?: string
          type?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          props: Json
          type: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          props?: Json
          type: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          props?: Json
          type?: string
        }
        Relationships: []
      }
      homeowners: {
        Row: {
          auth_user_id: string | null
          consent_at: string | null
          created_at: string
          email: string | null
          id: string
          marketing_consent: boolean
          name: string | null
          notify_email: boolean
          notify_sms: boolean
          phone: string | null
          respect_quiet_hrs: boolean
          sms_opt_out: boolean
        }
        Insert: {
          auth_user_id?: string | null
          consent_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          marketing_consent?: boolean
          name?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          phone?: string | null
          respect_quiet_hrs?: boolean
          sms_opt_out?: boolean
        }
        Update: {
          auth_user_id?: string | null
          consent_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          marketing_consent?: boolean
          name?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          phone?: string | null
          respect_quiet_hrs?: boolean
          sms_opt_out?: boolean
        }
        Relationships: []
      }
      homes: {
        Row: {
          address: string
          claimed_at: string | null
          claimed_by_homeowner: string | null
          created_at: string
          created_by_pro: string | null
          geocoded_at: string | null
          id: string
          lat: number | null
          lng: number | null
        }
        Insert: {
          address: string
          claimed_at?: string | null
          claimed_by_homeowner?: string | null
          created_at?: string
          created_by_pro?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
        }
        Update: {
          address?: string
          claimed_at?: string | null
          claimed_by_homeowner?: string | null
          created_at?: string
          created_by_pro?: string | null
          geocoded_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homes_created_by_pro_fkey"
            columns: ["created_by_pro"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homes_homeowner_fk"
            columns: ["claimed_by_homeowner"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          from_homeowner: string | null
          home_id: string
          id: string
          status: string
          to_pro_email: string | null
          to_pro_name: string
          to_pro_phone: string | null
          trade: string | null
        }
        Insert: {
          created_at?: string
          from_homeowner?: string | null
          home_id: string
          id?: string
          status?: string
          to_pro_email?: string | null
          to_pro_name: string
          to_pro_phone?: string | null
          trade?: string | null
        }
        Update: {
          created_at?: string
          from_homeowner?: string | null
          home_id?: string
          id?: string
          status?: string
          to_pro_email?: string | null
          to_pro_name?: string
          to_pro_phone?: string | null
          trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_from_homeowner_fkey"
            columns: ["from_homeowner"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string
          due_date: string | null
          home_id: string
          id: string
          items: Json
          job_id: string | null
          note: string | null
          paid_at: string | null
          pro_id: string
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          due_date?: string | null
          home_id: string
          id?: string
          items?: Json
          job_id?: string | null
          note?: string | null
          paid_at?: string | null
          pro_id: string
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          due_date?: string | null
          home_id?: string
          id?: string
          items?: Json
          job_id?: string | null
          note?: string | null
          paid_at?: string | null
          pro_id?: string
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          customer_id: string | null
          equipment_id: string | null
          home_id: string
          id: string
          next_service_date: string | null
          photo_url: string | null
          pro_id: string
          what_done: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          equipment_id?: string | null
          home_id: string
          id?: string
          next_service_date?: string | null
          photo_url?: string | null
          pro_id: string
          what_done: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          equipment_id?: string | null
          home_id?: string
          id?: string
          next_service_date?: string | null
          photo_url?: string | null
          pro_id?: string
          what_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          kind: string
          to_contact: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          kind: string
          to_contact: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          to_contact?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          application_fee_amount: number
          created_at: string
          currency: string
          home_id: string
          id: string
          invoice_id: string | null
          job_id: string | null
          pro_id: string
          status: string
          stripe_account_id: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          application_fee_amount?: number
          created_at?: string
          currency?: string
          home_id: string
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          pro_id: string
          status?: string
          stripe_account_id: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          application_fee_amount?: number
          created_at?: string
          currency?: string
          home_id?: string
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          pro_id?: string
          status?: string
          stripe_account_id?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
        ]
      }
      pros: {
        Row: {
          auth_user_id: string | null
          business: string
          created_at: string
          email: string | null
          google_place_id: string | null
          google_rating: number | null
          id: string
          jobber_connected: boolean
          logo: string | null
          notify_email: boolean
          notify_sms: boolean
          owner_first_name: string | null
          phone: string | null
          plan: string
          quickbooks_connected: boolean
          referral_code: string | null
          review_requests_on: boolean
          service_area: string | null
          square_connected: boolean
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          stripe_payouts_enabled: boolean
          trade: string
        }
        Insert: {
          auth_user_id?: string | null
          business: string
          created_at?: string
          email?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          id?: string
          jobber_connected?: boolean
          logo?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          owner_first_name?: string | null
          phone?: string | null
          plan?: string
          quickbooks_connected?: boolean
          referral_code?: string | null
          review_requests_on?: boolean
          service_area?: string | null
          square_connected?: boolean
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          trade: string
        }
        Update: {
          auth_user_id?: string | null
          business?: string
          created_at?: string
          email?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          id?: string
          jobber_connected?: boolean
          logo?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          owner_first_name?: string | null
          phone?: string | null
          plan?: string
          quickbooks_connected?: boolean
          referral_code?: string | null
          review_requests_on?: boolean
          service_area?: string | null
          square_connected?: boolean
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          stripe_payouts_enabled?: boolean
          trade?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          created_at: string
          id: string
          job_id: string
          public_url: string
          sent_email_at: string | null
          sent_sms_at: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          public_url: string
          sent_email_at?: string | null
          sent_sms_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          public_url?: string
          sent_email_at?: string | null
          sent_sms_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          homeowner_contact: string
          homeowner_name: string
          id: string
          message: string | null
          pro_slug: string
          source: string | null
          trade: string | null
        }
        Insert: {
          created_at?: string
          homeowner_contact: string
          homeowner_name: string
          id?: string
          message?: string | null
          pro_slug: string
          source?: string | null
          trade?: string | null
        }
        Update: {
          created_at?: string
          homeowner_contact?: string
          homeowner_name?: string
          id?: string
          message?: string | null
          pro_slug?: string
          source?: string | null
          trade?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_home: {
        Args: { p_marketing_consent?: boolean; p_record_id: string }
        Returns: string
      }
      export_my_homeowner_data: { Args: never; Returns: Json }
      export_my_pro_data: { Args: never; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      get_home_view: { Args: never; Returns: Json }
      get_public_pro_profile: {
        Args: { p_business: string; p_trade: string }
        Returns: Json
      }
      homeowner_add_equipment: {
        Args: {
          p_label?: string
          p_make: string
          p_model: string
          p_serial: string
          p_source: string
          p_type: string
          p_warranty_until: string
        }
        Returns: string
      }
      homeowner_create_invite: {
        Args: {
          p_to_pro_email: string
          p_to_pro_name: string
          p_to_pro_phone: string
          p_trade: string
        }
        Returns: string
      }
      homeowner_delete_equipment: {
        Args: { p_equipment_id: string }
        Returns: undefined
      }
      homeowner_ensure: {
        Args: { p_marketing_consent?: boolean }
        Returns: string
      }
      homeowner_signup: {
        Args: { p_address?: string; p_marketing_consent?: boolean }
        Returns: string
      }
      homeowner_update_equipment: {
        Args: {
          p_equipment_id: string
          p_label?: string
          p_make?: string
          p_model?: string
          p_serial?: string
          p_type?: string
          p_warranty_until?: string
        }
        Returns: undefined
      }
      homeowner_update_home: { Args: { p_address: string }; Returns: string }
      homeowner_update_profile: {
        Args: {
          p_email?: string
          p_marketing_consent?: boolean
          p_name?: string
          p_notify_email?: boolean
          p_notify_sms?: boolean
          p_phone?: string
          p_respect_quiet_hrs?: boolean
          p_sms_opt_out?: boolean
        }
        Returns: undefined
      }
      lookup_login_method: { Args: { p_email: string }; Returns: string }
      mark_record_viewed: { Args: { p_record_id: string }; Returns: undefined }
      my_homeowner_id: { Args: never; Returns: string }
      my_pro_id: { Args: never; Returns: string }
      pro_serves_home: { Args: { p_home_id: string }; Returns: boolean }
      pro_upsert_equipment: {
        Args: {
          p_home_id: string
          p_label?: string
          p_make?: string
          p_model?: string
          p_serial?: string
          p_type?: string
          p_warranty_until?: string
        }
        Returns: string
      }
      upsert_home_by_address: { Args: { p_address: string }; Returns: string }
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
