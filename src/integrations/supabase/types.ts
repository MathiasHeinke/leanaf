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
      admin_emails: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          updated_at?: string | null
          window_start?: string | null
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
      badges_backup: {
        Row: {
          badge_description: string | null
          badge_name: string | null
          badge_type: string | null
          earned_at: string | null
          id: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          badge_description?: string | null
          badge_name?: string | null
          badge_type?: string | null
          earned_at?: string | null
          id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          badge_description?: string | null
          badge_name?: string | null
          badge_type?: string | null
          earned_at?: string | null
          id?: string | null
          metadata?: Json | null
          user_id?: string | null
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
      brand_products: {
        Row: {
          barcode: string | null
          brand_name: string
          calories_adjustment: number | null
          carbs_adjustment: number | null
          created_at: string
          fats_adjustment: number | null
          food_id: string
          id: string
          package_size: number | null
          package_unit: string | null
          product_name: string
          protein_adjustment: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_name: string
          calories_adjustment?: number | null
          carbs_adjustment?: number | null
          created_at?: string
          fats_adjustment?: number | null
          food_id: string
          id?: string
          package_size?: number | null
          package_unit?: string | null
          product_name: string
          protein_adjustment?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_name?: string
          calories_adjustment?: number | null
          carbs_adjustment?: number | null
          created_at?: string
          fats_adjustment?: number | null
          food_id?: string
          id?: string
          package_size?: number | null
          package_unit?: string | null
          product_name?: string
          protein_adjustment?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_products_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_database"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      coach_knowledge_base: {
        Row: {
          coach_id: string
          content: string
          created_at: string
          expertise_area: string
          id: string
          knowledge_type: string
          priority_level: number | null
          scientific_paper_doi: string | null
          source_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          content: string
          created_at?: string
          expertise_area: string
          id?: string
          knowledge_type: string
          priority_level?: number | null
          scientific_paper_doi?: string | null
          source_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          content?: string
          created_at?: string
          expertise_area?: string
          id?: string
          knowledge_type?: string
          priority_level?: number | null
          scientific_paper_doi?: string | null
          source_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_ratings: {
        Row: {
          coach_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
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
      coach_specializations: {
        Row: {
          coach_id: string
          core_philosophy: string
          created_at: string
          expertise_areas: string[]
          id: string
          knowledge_focus: string[] | null
          methodology: string | null
          name: string
          specialization_description: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          core_philosophy: string
          created_at?: string
          expertise_areas: string[]
          id?: string
          knowledge_focus?: string[] | null
          methodology?: string | null
          name: string
          specialization_description: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          core_philosophy?: string
          created_at?: string
          expertise_areas?: string[]
          id?: string
          knowledge_focus?: string[] | null
          methodology?: string | null
          name?: string
          specialization_description?: string
          updated_at?: string
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
      exercise_sessions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          notes: string | null
          session_name: string | null
          start_time: string | null
          updated_at: string
          user_id: string
          workout_id: string | null
          workout_type: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          session_name?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
          workout_id?: string | null
          workout_type?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          session_name?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
          workout_id?: string | null
          workout_type?: string | null
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          created_at: string
          distance_m: number | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          session_id: string
          set_number: number
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id: string
          set_number: number
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exercise_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          exercises: Json
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          exercises?: Json
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          exercises?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: number | null
          equipment: string | null
          id: string
          instructions: string | null
          is_compound: boolean | null
          is_public: boolean | null
          muscle_groups: string[]
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: number | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_compound?: boolean | null
          is_public?: boolean | null
          muscle_groups?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: number | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_compound?: boolean | null
          is_public?: boolean | null
          muscle_groups?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string | null
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      food_aliases: {
        Row: {
          alias: string
          alias_type: string
          created_at: string
          food_id: string
          id: string
          language: string
          usage_frequency: number | null
        }
        Insert: {
          alias: string
          alias_type: string
          created_at?: string
          food_id: string
          id?: string
          language?: string
          usage_frequency?: number | null
        }
        Update: {
          alias?: string
          alias_type?: string
          created_at?: string
          food_id?: string
          id?: string
          language?: string
          usage_frequency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_aliases_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_database"
            referencedColumns: ["id"]
          },
        ]
      }
      food_database: {
        Row: {
          allergens: string[] | null
          barcode: string | null
          brand: string | null
          calcium: number | null
          calories: number | null
          carbs: number | null
          category: string | null
          cholesterol: number | null
          confidence_score: number | null
          created_at: string
          fats: number | null
          fiber: number | null
          id: string
          ingredients: string | null
          iron: number | null
          name: string
          name_de: string | null
          name_en: string | null
          protein: number | null
          saturated_fat: number | null
          serving_description: string | null
          serving_size: number | null
          sodium: number | null
          source: string
          source_id: string | null
          sugar: number | null
          trans_fat: number | null
          updated_at: string
          verified: boolean | null
          vitamin_c: number | null
        }
        Insert: {
          allergens?: string[] | null
          barcode?: string | null
          brand?: string | null
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          cholesterol?: number | null
          confidence_score?: number | null
          created_at?: string
          fats?: number | null
          fiber?: number | null
          id?: string
          ingredients?: string | null
          iron?: number | null
          name: string
          name_de?: string | null
          name_en?: string | null
          protein?: number | null
          saturated_fat?: number | null
          serving_description?: string | null
          serving_size?: number | null
          sodium?: number | null
          source: string
          source_id?: string | null
          sugar?: number | null
          trans_fat?: number | null
          updated_at?: string
          verified?: boolean | null
          vitamin_c?: number | null
        }
        Update: {
          allergens?: string[] | null
          barcode?: string | null
          brand?: string | null
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          cholesterol?: number | null
          confidence_score?: number | null
          created_at?: string
          fats?: number | null
          fiber?: number | null
          id?: string
          ingredients?: string | null
          iron?: number | null
          name?: string
          name_de?: string | null
          name_en?: string | null
          protein?: number | null
          saturated_fat?: number | null
          serving_description?: string | null
          serving_size?: number | null
          sodium?: number | null
          source?: string
          source_id?: string | null
          sugar?: number | null
          trans_fat?: number | null
          updated_at?: string
          verified?: boolean | null
          vitamin_c?: number | null
        }
        Relationships: []
      }
      food_embeddings: {
        Row: {
          created_at: string
          embedding: string | null
          food_id: string
          id: string
          text_content: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          food_id: string
          id?: string
          text_content: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          food_id?: string
          id?: string
          text_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_embeddings_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_database"
            referencedColumns: ["id"]
          },
        ]
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
      scientific_papers: {
        Row: {
          abstract: string | null
          authors: string[] | null
          coach_relevance: Json | null
          created_at: string
          doi: string | null
          full_text: string | null
          id: string
          journal: string | null
          key_findings: string[] | null
          keywords: string[] | null
          practical_applications: string[] | null
          publication_year: number | null
          title: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          coach_relevance?: Json | null
          created_at?: string
          doi?: string | null
          full_text?: string | null
          id?: string
          journal?: string | null
          key_findings?: string[] | null
          keywords?: string[] | null
          practical_applications?: string[] | null
          publication_year?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          coach_relevance?: Json | null
          created_at?: string
          doi?: string | null
          full_text?: string | null
          id?: string
          journal?: string | null
          key_findings?: string[] | null
          keywords?: string[] | null
          practical_applications?: string[] | null
          publication_year?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_category: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category?: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sleep_tracking: {
        Row: {
          bedtime: string | null
          bonus_points: number | null
          created_at: string
          date: string
          id: string
          last_meal_time: string | null
          morning_libido: number | null
          motivation_level: number | null
          notes: string | null
          quality_score: number | null
          screen_time_evening: number | null
          sleep_hours: number | null
          sleep_interruptions: number | null
          sleep_quality: number | null
          updated_at: string
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          bonus_points?: number | null
          created_at?: string
          date?: string
          id?: string
          last_meal_time?: string | null
          morning_libido?: number | null
          motivation_level?: number | null
          notes?: string | null
          quality_score?: number | null
          screen_time_evening?: number | null
          sleep_hours?: number | null
          sleep_interruptions?: number | null
          sleep_quality?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          bonus_points?: number | null
          created_at?: string
          date?: string
          id?: string
          last_meal_time?: string | null
          morning_libido?: number | null
          motivation_level?: number | null
          notes?: string | null
          quality_score?: number | null
          screen_time_evening?: number | null
          sleep_hours?: number | null
          sleep_interruptions?: number | null
          sleep_quality?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
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
      user_food_corrections: {
        Row: {
          confidence_after: number | null
          confidence_before: number | null
          corrected_food_id: string | null
          corrected_values: Json | null
          correction_type: string
          created_at: string
          food_query: string
          id: string
          original_values: Json | null
          suggested_food_id: string | null
          user_id: string
        }
        Insert: {
          confidence_after?: number | null
          confidence_before?: number | null
          corrected_food_id?: string | null
          corrected_values?: Json | null
          correction_type: string
          created_at?: string
          food_query: string
          id?: string
          original_values?: Json | null
          suggested_food_id?: string | null
          user_id: string
        }
        Update: {
          confidence_after?: number | null
          confidence_before?: number | null
          corrected_food_id?: string | null
          corrected_values?: Json | null
          correction_type?: string
          created_at?: string
          food_query?: string
          id?: string
          original_values?: Json | null
          suggested_food_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_food_corrections_corrected_food_id_fkey"
            columns: ["corrected_food_id"]
            isOneToOne: false
            referencedRelation: "food_database"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_food_corrections_suggested_food_id_fkey"
            columns: ["suggested_food_id"]
            isOneToOne: false
            referencedRelation: "food_database"
            referencedColumns: ["id"]
          },
        ]
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
      award_badge_atomically: {
        Args: {
          p_user_id: string
          p_badge_type: string
          p_badge_name: string
          p_badge_description: string
          p_metadata?: Json
        }
        Returns: boolean
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_ai_usage_limit: {
        Args: {
          p_user_id: string
          p_feature_type: string
          p_daily_limit?: number
          p_monthly_limit?: number
        }
        Returns: Json
      }
      check_and_update_rate_limit: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_window_minutes?: number
          p_max_requests?: number
        }
        Returns: Json
      }
      check_rate_limit_progressive: {
        Args: {
          p_identifier: string
          p_action: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      detect_suspicious_activity: {
        Args: { p_identifier: string; p_time_window_minutes?: number }
        Returns: Json
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin_by_email: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_enterprise_or_super_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      is_super_admin_by_email: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_failed_login_attempt: {
        Args: {
          p_email?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_failure_reason?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_user_id: string
          p_action: string
          p_resource_type?: string
          p_resource_id?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          p_user_id?: string
          p_event_type?: string
          p_event_category?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_metadata?: Json
          p_severity?: string
        }
        Returns: undefined
      }
      search_foods_by_text: {
        Args: { search_query: string; match_count?: number }
        Returns: {
          food_id: string
          name: string
          brand: string
          category: string
          calories: number
          protein: number
          carbs: number
          fats: number
          rank: number
        }[]
      }
      search_similar_foods: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          match_count?: number
        }
        Returns: {
          food_id: string
          name: string
          brand: string
          similarity: number
          calories: number
          protein: number
          carbs: number
          fats: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_user_points_and_level: {
        Args: {
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
      validate_password_strength: {
        Args: { password: string }
        Returns: Json
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
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
