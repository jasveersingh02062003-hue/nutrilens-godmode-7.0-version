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
      ad_campaigns: {
        Row: {
          brand_id: string
          budget_spent: number
          budget_total: number
          campaign_name: string
          cpc_rate: number | null
          cpm_rate: number | null
          created_at: string
          daily_click_cap: number
          end_date: string
          id: string
          pes_score: number
          placement_slot: string
          pricing_model: string
          start_date: string
          status: string
          target_categories: string[] | null
          target_diet: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          budget_spent?: number
          budget_total?: number
          campaign_name: string
          cpc_rate?: number | null
          cpm_rate?: number | null
          created_at?: string
          daily_click_cap?: number
          end_date: string
          id?: string
          pes_score?: number
          placement_slot?: string
          pricing_model?: string
          start_date: string
          status?: string
          target_categories?: string[] | null
          target_diet?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          budget_spent?: number
          budget_total?: number
          campaign_name?: string
          cpc_rate?: number | null
          cpm_rate?: number | null
          created_at?: string
          daily_click_cap?: number
          end_date?: string
          id?: string
          pes_score?: number
          placement_slot?: string
          pricing_model?: string
          start_date?: string
          status?: string
          target_categories?: string[] | null
          target_diet?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          impression_id: string | null
          is_suspicious: boolean
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          impression_id?: string | null
          is_suspicious?: boolean
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          impression_id?: string | null
          is_suspicious?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_clicks_impression_id_fkey"
            columns: ["impression_id"]
            isOneToOne: false
            referencedRelation: "ad_impressions"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_conversions: {
        Row: {
          campaign_id: string
          conversion_type: string
          created_at: string
          id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          conversion_type?: string
          created_at?: string
          id?: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          conversion_type?: string
          created_at?: string
          id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_conversions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "packed_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          campaign_id: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          format: string
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          subtitle: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          format?: string
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          format?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          campaign_id: string
          created_at: string
          creative_id: string
          id: string
          is_suspicious: boolean
          placement_slot: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creative_id: string
          id?: string
          is_suspicious?: boolean
          placement_slot: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creative_id?: string
          id?: string
          is_suspicious?: boolean
          placement_slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          created_at: string
          format: string
          id: string
          is_active: boolean
          location_name: string
          max_ads: number
          slot_id: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          is_active?: boolean
          location_name: string
          max_ads?: number
          slot_id: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          is_active?: boolean
          location_name?: string
          max_ads?: number
          slot_id?: string
        }
        Relationships: []
      }
      ad_targeting: {
        Row: {
          campaign_id: string
          cities: string[] | null
          created_at: string
          id: string
          max_user_budget: number | null
          meal_context: string | null
          min_protein_gap: number | null
        }
        Insert: {
          campaign_id: string
          cities?: string[] | null
          created_at?: string
          id?: string
          max_user_budget?: number | null
          meal_context?: string | null
          min_protein_gap?: number | null
        }
        Update: {
          campaign_id?: string
          cities?: string[] | null
          created_at?: string
          id?: string
          max_user_budget?: number | null
          meal_context?: string | null
          min_protein_gap?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_targeting_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_quota: {
        Row: {
          count: number
          endpoint: string
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          endpoint: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          endpoint?: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          cost_inr: number
          created_at: string
          id: string
          metadata: Json
          units: number
          vendor: string
        }
        Insert: {
          cost_inr?: number
          created_at?: string
          id?: string
          metadata?: Json
          units?: number
          vendor: string
        }
        Update: {
          cost_inr?: number
          created_at?: string
          id?: string
          metadata?: Json
          units?: number
          vendor?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_table: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_table?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_table?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      brand_accounts: {
        Row: {
          balance: number
          billing_address: Json | null
          brand_name: string
          contact_email: string | null
          created_at: string
          gstin: string | null
          id: string
          logo_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          balance?: number
          billing_address?: Json | null
          brand_name: string
          contact_email?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          logo_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          billing_address?: Json | null
          brand_name?: string
          contact_email?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          logo_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_documents: {
        Row: {
          brand_id: string
          created_at: string
          doc_type: string
          id: string
          notes: string | null
          status: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          doc_type: string
          id?: string
          notes?: string | null
          status?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          doc_type?: string
          id?: string
          notes?: string | null
          status?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_documents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_intake: {
        Row: {
          brand_name: string
          categories: string[] | null
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          monthly_budget_inr: number | null
          notes: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          website: string | null
        }
        Insert: {
          brand_name: string
          categories?: string[] | null
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          monthly_budget_inr?: number | null
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          brand_name?: string
          categories?: string[] | null
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          monthly_budget_inr?: number | null
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_transactions: {
        Row: {
          amount: number
          brand_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reference: string | null
          type: string
        }
        Insert: {
          amount: number
          brand_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          type: string
        }
        Update: {
          amount?: number
          brand_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reference?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      city_prices: {
        Row: {
          avg_price: number
          city: string
          id: string
          item_name: string
          max_price: number | null
          min_price: number | null
          price_date: string
          report_count: number | null
          source: string
          updated_at: string
        }
        Insert: {
          avg_price: number
          city: string
          id?: string
          item_name: string
          max_price?: number | null
          min_price?: number | null
          price_date?: string
          report_count?: number | null
          source?: string
          updated_at?: string
        }
        Update: {
          avg_price?: number
          city?: string
          id?: string
          item_name?: string
          max_price?: number | null
          min_price?: number | null
          price_date?: string
          report_count?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          purpose: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          purpose: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          purpose?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_constants: {
        Row: {
          id: string
          monthly_cost_inr: number
          notes: string | null
          updated_at: string
          updated_by: string | null
          vendor: string
        }
        Insert: {
          id?: string
          monthly_cost_inr?: number
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor: string
        }
        Update: {
          id?: string
          monthly_cost_inr?: number
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          id: string
          log_data: Json
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_data?: Json
          log_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_data?: Json
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_plans: {
        Row: {
          config: Json
          created_at: string | null
          end_date: string
          id: string
          plan_type: string
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          end_date: string
          id?: string
          plan_type: string
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          end_date?: string
          id?: string
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      monika_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      packed_products: {
        Row: {
          affiliate_links: Json | null
          allergens: Json | null
          barcode: string | null
          brand: string
          calories: number | null
          carbs: number | null
          category: Database["public"]["Enums"]["packed_product_category"]
          cost_per_gram_protein: number | null
          created_at: string
          fat: number | null
          fiber: number | null
          id: string
          image_url: string | null
          is_verified: boolean | null
          mrp: number
          pes_score: number | null
          platforms: Json | null
          product_name: string
          protein: number | null
          selling_price: number | null
          serving_size: string | null
          sugar: number | null
          updated_at: string
        }
        Insert: {
          affiliate_links?: Json | null
          allergens?: Json | null
          barcode?: string | null
          brand: string
          calories?: number | null
          carbs?: number | null
          category: Database["public"]["Enums"]["packed_product_category"]
          cost_per_gram_protein?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          mrp: number
          pes_score?: number | null
          platforms?: Json | null
          product_name: string
          protein?: number | null
          selling_price?: number | null
          serving_size?: string | null
          sugar?: number | null
          updated_at?: string
        }
        Update: {
          affiliate_links?: Json | null
          allergens?: Json | null
          barcode?: string | null
          brand?: string
          calories?: number | null
          carbs?: number | null
          category?: Database["public"]["Enums"]["packed_product_category"]
          cost_per_gram_protein?: number | null
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          mrp?: number
          pes_score?: number | null
          platforms?: Json | null
          product_name?: string
          protein?: number | null
          selling_price?: number | null
          serving_size?: string | null
          sugar?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount_inr: number | null
          created_at: string
          event_type: string
          id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string | null
          raw_payload: Json
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_inr?: number | null
          created_at?: string
          event_type: string
          id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string | null
          raw_payload?: Json
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_inr?: number | null
          created_at?: string
          event_type?: string
          id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string | null
          raw_payload?: Json
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_default: boolean
          metadata: Json
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_default?: boolean
          metadata?: Json
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean
          metadata?: Json
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alert_notifications: {
        Row: {
          alert_id: string | null
          city: string
          created_at: string
          current_price: number
          direction: string
          id: string
          is_read: boolean
          item_name: string
          threshold_price: number
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          city: string
          created_at?: string
          current_price: number
          direction?: string
          id?: string
          is_read?: boolean
          item_name: string
          threshold_price: number
          user_id: string
        }
        Update: {
          alert_id?: string | null
          city?: string
          created_at?: string
          current_price?: number
          direction?: string
          id?: string
          is_read?: boolean
          item_name?: string
          threshold_price?: number
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          city: string
          comparison_type: string
          created_at: string
          id: string
          is_active: boolean
          item_name: string
          last_triggered_at: string | null
          threshold_price: number
          user_id: string
        }
        Insert: {
          city: string
          comparison_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_name: string
          last_triggered_at?: string | null
          threshold_price: number
          user_id: string
        }
        Update: {
          city?: string
          comparison_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_name?: string
          last_triggered_at?: string | null
          threshold_price?: number
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          avg_price: number
          city: string
          created_at: string
          id: string
          item_name: string
          price_date: string
          source: string
        }
        Insert: {
          avg_price: number
          city: string
          created_at?: string
          id?: string
          item_name: string
          price_date?: string
          source?: string
        }
        Update: {
          avg_price?: number
          city?: string
          created_at?: string
          id?: string
          item_name?: string
          price_date?: string
          source?: string
        }
        Relationships: []
      }
      price_reports: {
        Row: {
          city: string
          id: string
          is_verified: boolean | null
          item_name: string
          price_per_unit: number
          reported_at: string
          unit: string
          user_id: string
        }
        Insert: {
          city: string
          id?: string
          is_verified?: boolean | null
          item_name: string
          price_per_unit: number
          reported_at?: string
          unit?: string
          user_id: string
        }
        Update: {
          city?: string
          id?: string
          is_verified?: boolean | null
          item_name?: string
          price_per_unit?: number
          reported_at?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          alcohol: string | null
          bmi: number | null
          bmr: number | null
          budget: Json | null
          caffeine: string | null
          city: string | null
          coach_settings: Json | null
          conditions: Json | null
          cooking_habits: string | null
          created_at: string | null
          daily_calories: number | null
          daily_carbs: number | null
          daily_fat: number | null
          daily_protein: number | null
          dietary_prefs: Json | null
          dob: string | null
          eating_out: string | null
          exercise_routine: string | null
          gender: string | null
          goal: string | null
          goal_speed: number | null
          health_conditions: Json | null
          height_cm: number | null
          id: string
          job_type: string | null
          join_date: string | null
          learning: Json | null
          marketing_consent: boolean
          meal_times: Json | null
          medications: string | null
          men_health: Json | null
          name: string | null
          notification_settings: Json | null
          occupation: string | null
          onboarding_complete: boolean | null
          photo_url: string | null
          sleep_hours: string | null
          stress_level: string | null
          target_weight: number | null
          tdee: number | null
          updated_at: string | null
          water_goal: number | null
          weight_kg: number | null
          women_health: Json | null
          work_activity: string | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          alcohol?: string | null
          bmi?: number | null
          bmr?: number | null
          budget?: Json | null
          caffeine?: string | null
          city?: string | null
          coach_settings?: Json | null
          conditions?: Json | null
          cooking_habits?: string | null
          created_at?: string | null
          daily_calories?: number | null
          daily_carbs?: number | null
          daily_fat?: number | null
          daily_protein?: number | null
          dietary_prefs?: Json | null
          dob?: string | null
          eating_out?: string | null
          exercise_routine?: string | null
          gender?: string | null
          goal?: string | null
          goal_speed?: number | null
          health_conditions?: Json | null
          height_cm?: number | null
          id: string
          job_type?: string | null
          join_date?: string | null
          learning?: Json | null
          marketing_consent?: boolean
          meal_times?: Json | null
          medications?: string | null
          men_health?: Json | null
          name?: string | null
          notification_settings?: Json | null
          occupation?: string | null
          onboarding_complete?: boolean | null
          photo_url?: string | null
          sleep_hours?: string | null
          stress_level?: string | null
          target_weight?: number | null
          tdee?: number | null
          updated_at?: string | null
          water_goal?: number | null
          weight_kg?: number | null
          women_health?: Json | null
          work_activity?: string | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          alcohol?: string | null
          bmi?: number | null
          bmr?: number | null
          budget?: Json | null
          caffeine?: string | null
          city?: string | null
          coach_settings?: Json | null
          conditions?: Json | null
          cooking_habits?: string | null
          created_at?: string | null
          daily_calories?: number | null
          daily_carbs?: number | null
          daily_fat?: number | null
          daily_protein?: number | null
          dietary_prefs?: Json | null
          dob?: string | null
          eating_out?: string | null
          exercise_routine?: string | null
          gender?: string | null
          goal?: string | null
          goal_speed?: number | null
          health_conditions?: Json | null
          height_cm?: number | null
          id?: string
          job_type?: string | null
          join_date?: string | null
          learning?: Json | null
          marketing_consent?: boolean
          meal_times?: Json | null
          medications?: string | null
          men_health?: Json | null
          name?: string | null
          notification_settings?: Json | null
          occupation?: string | null
          onboarding_complete?: boolean | null
          photo_url?: string | null
          sleep_hours?: string | null
          stress_level?: string | null
          target_weight?: number | null
          tdee?: number | null
          updated_at?: string | null
          water_goal?: number | null
          weight_kg?: number | null
          women_health?: Json | null
          work_activity?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          has_used_trial: boolean
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          has_used_trial?: boolean
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          has_used_trial?: boolean
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplement_logs: {
        Row: {
          id: string
          log_date: string
          supplements: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          log_date: string
          supplements?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          log_date?: string
          supplements?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          metadata: Json | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          cups: number
          id: string
          log_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cups?: number
          id?: string
          log_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cups?: number
          id?: string
          log_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string | null
          id: string
          log_date: string
          unit: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_date: string
          unit?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          id?: string
          log_date?: string
          unit?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      age_bucket: { Args: { _age: number }; Returns: string }
      apply_brand_transaction: {
        Args: {
          p_amount: number
          p_brand_id: string
          p_notes?: string
          p_reference?: string
          p_type: string
        }
        Returns: string
      }
      campaign_brand_id: { Args: { _campaign_id: string }; Returns: string }
      cancel_my_subscription: {
        Args: never
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          status: Database["public"]["Enums"]["subscription_status"]
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      get_ai_quota: { Args: { p_endpoint: string }; Returns: number }
      get_masked_profile: {
        Args: { _user_id: string }
        Returns: {
          age_range: string
          city: string
          created_at: string
          first_name: string
          gender: string
          goal: string
          id: string
          join_date: string
          marketing_consent: boolean
          onboarding_complete: boolean
        }[]
      }
      get_masked_profiles: {
        Args: never
        Returns: {
          age_range: string
          city: string
          created_at: string
          first_name: string
          gender: string
          goal: string
          id: string
          join_date: string
          marketing_consent: boolean
          onboarding_complete: boolean
        }[]
      }
      get_my_active_plan: {
        Args: never
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          has_used_trial: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_quota: { Args: { p_endpoint: string }; Returns: number }
      is_brand_member: { Args: { _brand_id: string }; Returns: boolean }
      is_marketer: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_support: { Args: { _user_id: string }; Returns: boolean }
      start_trial: {
        Args: never
        Returns: {
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string
        }[]
      }
      upsert_daily_log: {
        Args: {
          p_expected_updated_at: string
          p_log_data: Json
          p_log_date: string
        }
        Returns: {
          id: string
          log_data: Json
          log_date: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "super_admin"
        | "brand_manager"
        | "owner"
        | "marketer"
        | "support"
      packed_product_category:
        | "protein_drink"
        | "protein_bar"
        | "ready_to_eat"
        | "frozen"
        | "spread"
        | "supplement"
        | "beverage"
        | "snack"
      payment_provider: "mock" | "razorpay" | "stripe"
      subscription_plan: "free" | "premium" | "ultra"
      subscription_status:
        | "active"
        | "cancelled"
        | "expired"
        | "trialing"
        | "past_due"
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
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "super_admin",
        "brand_manager",
        "owner",
        "marketer",
        "support",
      ],
      packed_product_category: [
        "protein_drink",
        "protein_bar",
        "ready_to_eat",
        "frozen",
        "spread",
        "supplement",
        "beverage",
        "snack",
      ],
      payment_provider: ["mock", "razorpay", "stripe"],
      subscription_plan: ["free", "premium", "ultra"],
      subscription_status: [
        "active",
        "cancelled",
        "expired",
        "trialing",
        "past_due",
      ],
    },
  },
} as const
