/**
 * Database types generated from the hosted Sangham Supabase project
 * (ref uqvuqbwhbrqjynyxzecs) on 2026-07-25 via the Supabase MCP
 * (generate_typescript_types). Regenerate after any migration:
 *   npx supabase gen types typescript --project-id uqvuqbwhbrqjynyxzecs
 */

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
      access_logs: {
        Row: {
          action: string
          asset_id: string | null
          created_at: string
          id: number
          ip_hash: string | null
          lesson_id: string | null
          product_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          asset_id?: string | null
          created_at?: string
          id?: never
          ip_hash?: string | null
          lesson_id?: string | null
          product_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          asset_id?: string | null
          created_at?: string
          id?: never
          ip_hash?: string | null
          lesson_id?: string | null
          product_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: number
          meta: Json | null
          reason: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: never
          meta?: Json | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: never
          meta?: Json | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_product_id: string
          child_product_id: string
        }
        Insert: {
          bundle_product_id: string
          child_product_id: string
        }
        Update: {
          bundle_product_id?: string
          child_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_product_id_fkey"
            columns: ["bundle_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_child_product_id_fkey"
            columns: ["child_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          bytes: number | null
          created_at: string
          external_provider: string | null
          external_ref: string | null
          id: string
          kind: string
          mime_type: string | null
          sha256: string | null
          storage_bucket: string | null
          storage_path: string | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          external_provider?: string | null
          external_ref?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          sha256?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          external_provider?: string | null
          external_ref?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          sha256?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          lesson_id: string
          position_seconds: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          lesson_id: string
          position_seconds?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          lesson_id?: string
          position_seconds?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          id: string
          product_id: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_consents: {
        Row: {
          confirmed_at: string | null
          consent_text_version: string | null
          created_at: string
          email: string
          id: string
          purpose: string
          source: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          consent_text_version?: string | null
          created_at?: string
          email: string
          id?: string
          purpose: string
          source?: string | null
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          consent_text_version?: string | null
          created_at?: string
          email?: string
          id?: string
          purpose?: string
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      entitlement_events: {
        Row: {
          actor: string
          created_at: string
          entitlement_id: string
          event: string
          id: string
          reason: string | null
        }
        Insert: {
          actor?: string
          created_at?: string
          entitlement_id: string
          event: string
          id?: string
          reason?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          entitlement_id?: string
          event?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_events_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          granted_at: string
          id: string
          order_id: string | null
          product_id: string
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          source: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body_markdown: string | null
          content_asset_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_free_preview: boolean
          lesson_type: string
          module_id: string
          product_id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body_markdown?: string | null
          content_asset_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          lesson_type: string
          module_id: string
          product_id: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string | null
          content_asset_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          lesson_type?: string
          module_id?: string
          product_id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_content_asset_id_fkey"
            columns: ["content_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          email: string
          id: string
          order_ref: string
          product_id: string
          provider: string
          provider_order_ref: string | null
          status: string
          test_mode: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          email: string
          id?: string
          order_ref?: string
          product_id: string
          provider: string
          provider_order_ref?: string | null
          status?: string
          test_mode?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          email?: string
          id?: string
          order_ref?: string
          product_id?: string
          provider?: string
          provider_order_ref?: string | null
          status?: string
          test_mode?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          order_id: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          raw: Json | null
          signature_valid: boolean | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          raw?: Json | null
          signature_valid?: boolean | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          raw?: Json | null
          signature_valid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_versions: {
        Row: {
          content_sha256: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          released_at: string | null
          version_label: string
        }
        Insert: {
          content_sha256?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          released_at?: string | null
          version_label: string
        }
        Update: {
          content_sha256?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          released_at?: string | null
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cover_path: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_public_access: boolean
          price_cents: number | null
          price_usd_cents: number | null
          product_type: string
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_public_access?: boolean
          price_cents?: number | null
          price_usd_cents?: number | null
          product_type: string
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_public_access?: boolean
          price_cents?: number | null
          price_usd_cents?: number | null
          product_type?: string
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_my_entitlements: { Args: never; Returns: number }
      gen_order_ref: { Args: never; Returns: string }
      has_active_entitlement: {
        Args: { p_product_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
