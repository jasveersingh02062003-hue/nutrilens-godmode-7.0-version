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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
      price_reports: {
        Row: {
          city: string
          id: string
          item_name: string
          price_per_unit: number
          reported_at: string
          unit: string
          user_id: string
        }
        Insert: {
          city: string
          id?: string
          item_name: string
          price_per_unit: number
          reported_at?: string
          unit?: string
          user_id: string
        }
        Update: {
          city?: string
          id?: string
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
          learning: Json | null
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
          learning?: Json | null
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
          learning?: Json | null
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
