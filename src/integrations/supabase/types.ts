export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_limits: {
        Row: {
          created_at: string
          daily_count: number
          feature_type: string
          id: string
          last_reset_date: string
          last_reset_month: string
          monthly_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_count?: number
          feature_type: string
          id?: string
          last_reset_date?: string
          last_reset_month?: string
          monthly_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_count?: number
          feature_type?: string
          id?: string
          last_reset_date?: string
          last_reset_month?: string
          monthly_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          arms: number | null
          belly: number | null
          chest: number | null
          created_at: string
          date: string
          hips: number | null
          id: string
          neck: number | null
          notes: string | null
          photo_url: string | null
          thigh: number | null
          updated_at: string
          user_id: string
          waist: number | null
        }
        Insert: {
          arms?: number | null
          belly?: number | null
          chest?: number | null
          created_at?: string
          date?: string
          hips?: number | null
          id?: string
          neck?: number | null
          notes?: string | null
          photo_url?: string | null
          thigh?: number | null
          updated_at?: string
          user_id: string
          waist?: number | null
        }
        Update: {
          arms?: number | null
          belly?: number | null
          chest?: number | null
          created_at?: string
          date?: string
          hips?: number | null
          id?: string
          neck?: number | null
          notes?: string | null
          photo_url?: string | null
          thigh?: number | null
          updated_at?: string
          user_id?: string
          waist?: number | null
        }
        Relationships: []
      }
      coach_conversations: {
        Row: {
          coach_personality: string | null
          context_data: Json | null
          created_at: string
          id: string
          message_content: string
          message_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_personality?: string | null
          context_data?: Json | null
          created_at?: string
          id?: string
          message_content: string
          message_role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_personality?: string | null
          context_data?: Json | null
          created_at?: string
          id?: string
          message_content?: string
          message_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_recommendations: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          last_recommendation_sent: string | null
          recommendation_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          last_recommendation_sent?: string | null
          recommendation_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          last_recommendation_sent?: string | null
          recommendation_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          bmr: number | null
          calorie_deficit: number | null
          calories: number | null
          carbs: number | null
          carbs_percentage: number | null
          created_at: string
          fats: number | null
          fats_percentage: number | null
          id: string
          protein: number | null
          protein_percentage: number | null
          tdee: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bmr?: number | null
          calorie_deficit?: number | null
          calories?: number | null
          carbs?: number | null
          carbs_percentage?: number | null
          created_at?: string
          fats?: number | null
          fats_percentage?: number | null
          id?: string
          protein?: number | null
          protein_percentage?: number | null
          tdee?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bmr?: number | null
          calorie_deficit?: number | null
          calories?: number | null
          carbs?: number | null
          carbs_percentage?: number | null
          created_at?: string
          fats?: number | null
          fats_percentage?: number | null
          id?: string
          protein?: number | null
          protein_percentage?: number | null
          tdee?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      department_progress: {
        Row: {
          created_at: string
          department: string
          id: string
          level: number
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          level?: number
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          level?: number
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          meal_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          meal_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          meal_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          ai_feedback: string | null
          bonus_points: number | null
          calories: number | null
          carbs: number | null
          created_at: string
          evaluation_criteria: Json | null
          fats: number | null
          id: string
          images: string[] | null
          meal_type: string | null
          protein: number | null
          quality_score: number | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          bonus_points?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          evaluation_criteria?: Json | null
          fats?: number | null
          id?: string
          images?: string[] | null
          meal_type?: string | null
          protein?: number | null
          quality_score?: number | null
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          bonus_points?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          evaluation_criteria?: Json | null
          fats?: number | null
          id?: string
          images?: string[] | null
          meal_type?: string | null
          protein?: number | null
          quality_score?: number | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      men_quotes: {
        Row: {
          author: string | null
          created_at: string
          id: string
          language: string | null
          quote_text: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          language?: string | null
          quote_text: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          language?: string | null
          quote_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_activities: {
        Row: {
          activity_type: string
          bonus_reason: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          multiplier: number
          points_earned: number
          streak_length: number | null
          trial_multiplier: number | null
          user_id: string
        }
        Insert: {
          activity_type: string
          bonus_reason?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          multiplier?: number
          points_earned: number
          streak_length?: number | null
          trial_multiplier?: number | null
          user_id: string
        }
        Update: {
          activity_type?: string
          bonus_reason?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          multiplier?: number
          points_earned?: number
          streak_length?: number | null
          trial_multiplier?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          coach_personality: string | null
          created_at: string
          current_bmi: number | null
          current_period_end: string | null
          display_name: string | null
          email: string | null
          gender: string | null
          goal: string | null
          height: number | null
          hide_premium_features: boolean | null
          id: string
          macro_strategy: string | null
          muscle_maintenance_priority: boolean | null
          preferred_language: string | null
          preferred_theme: string | null
          start_bmi: number | null
          start_weight: number | null
          subscription_id: string | null
          subscription_status: string | null
          target_bmi: number | null
          target_date: string | null
          target_weight: number | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          coach_personality?: string | null
          created_at?: string
          current_bmi?: number | null
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          hide_premium_features?: boolean | null
          id?: string
          macro_strategy?: string | null
          muscle_maintenance_priority?: boolean | null
          preferred_language?: string | null
          preferred_theme?: string | null
          start_bmi?: number | null
          start_weight?: number | null
          subscription_id?: string | null
          subscription_status?: string | null
          target_bmi?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          coach_personality?: string | null
          created_at?: string
          current_bmi?: number | null
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          hide_premium_features?: boolean | null
          id?: string
          macro_strategy?: string | null
          muscle_maintenance_priority?: boolean | null
          preferred_language?: string | null
          preferred_theme?: string | null
          start_bmi?: number | null
          start_weight?: number | null
          subscription_id?: string | null
          subscription_status?: string | null
          target_bmi?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_tracking: {
        Row: {
          bonus_points: number | null
          created_at: string
          date: string
          id: string
          notes: string | null
          quality_score: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          quality_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_points?: number | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          quality_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          current_level: number
          id: string
          level_name: string
          points_to_next_level: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          id?: string
          level_name?: string
          points_to_next_level?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          id?: string
          level_name?: string
          points_to_next_level?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          streak_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          started_at: string
          trial_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          trial_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          trial_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          date: string
          id: string
          muscle_percentage: number | null
          notes: string | null
          photo_urls: Json | null
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          date?: string
          id?: string
          muscle_percentage?: number | null
          notes?: string | null
          photo_urls?: Json | null
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          date?: string
          id?: string
          muscle_percentage?: number | null
          notes?: string | null
          photo_urls?: Json | null
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      women_quotes: {
        Row: {
          author: string | null
          created_at: string
          id: string
          language: string | null
          quote_text: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          language?: string | null
          quote_text: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          language?: string | null
          quote_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          bonus_points: number | null
          created_at: string
          date: string
          did_workout: boolean
          distance_km: number | null
          duration_minutes: number | null
          id: string
          intensity: number | null
          notes: string | null
          quality_score: number | null
          steps: number | null
          updated_at: string
          user_id: string
          walking_notes: string | null
          workout_type: string | null
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string
          date?: string
          did_workout?: boolean
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          intensity?: number | null
          notes?: string | null
          quality_score?: number | null
          steps?: number | null
          updated_at?: string
          user_id: string
          walking_notes?: string | null
          workout_type?: string | null
        }
        Update: {
          bonus_points?: number | null
          created_at?: string
          date?: string
          did_workout?: boolean
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          intensity?: number | null
          notes?: string | null
          quality_score?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          walking_notes?: string | null
          workout_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_ai_usage_limit: {
        Args: {
          p_user_id: string
          p_feature_type: string
          p_daily_limit?: number
          p_monthly_limit?: number
        }
        Returns: Json
      }
      update_user_points_and_level: {
        Args:
          | {
              p_user_id: string
              p_points: number
              p_activity_type: string
              p_description?: string
              p_multiplier?: number
            }
          | {
              p_user_id: string
              p_points: number
              p_activity_type: string
              p_description?: string
              p_multiplier?: number
              p_trial_multiplier?: number
            }
        Returns: Json
      }
      update_user_streak: {
        Args: {
          p_user_id: string
          p_streak_type: string
          p_activity_date?: string
        }
        Returns: number
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
