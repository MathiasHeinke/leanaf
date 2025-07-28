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
      automated_pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          entries_failed: number | null
          entries_processed: number | null
          entries_successful: number | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          pipeline_type: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          entries_failed?: number | null
          entries_processed?: number | null
          entries_successful?: number | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          pipeline_type?: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          entries_failed?: number | null
          entries_processed?: number | null
          entries_successful?: number | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          pipeline_type?: string
          started_at?: string
          status?: string
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
          conversation_date: string
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
          conversation_date?: string
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
          conversation_date?: string
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
      coach_memory: {
        Row: {
          created_at: string
          id: string
          memory_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_pipeline_status: {
        Row: {
          avg_embedding_quality: number | null
          coach_id: string
          created_at: string
          current_topic_focus: string | null
          id: string
          is_active: boolean
          knowledge_completion_rate: number | null
          last_pipeline_run: string | null
          metadata: Json | null
          next_scheduled_run: string | null
          pipeline_health_score: number | null
          total_knowledge_entries: number | null
          updated_at: string
        }
        Insert: {
          avg_embedding_quality?: number | null
          coach_id: string
          created_at?: string
          current_topic_focus?: string | null
          id?: string
          is_active?: boolean
          knowledge_completion_rate?: number | null
          last_pipeline_run?: string | null
          metadata?: Json | null
          next_scheduled_run?: string | null
          pipeline_health_score?: number | null
          total_knowledge_entries?: number | null
          updated_at?: string
        }
        Update: {
          avg_embedding_quality?: number | null
          coach_id?: string
          created_at?: string
          current_topic_focus?: string | null
          id?: string
          is_active?: boolean
          knowledge_completion_rate?: number | null
          last_pipeline_run?: string | null
          metadata?: Json | null
          next_scheduled_run?: string | null
          pipeline_health_score?: number | null
          total_knowledge_entries?: number | null
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
      coach_topic_configurations: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          is_enabled: boolean
          knowledge_depth: string | null
          last_updated_at: string | null
          priority_level: number
          search_keywords: Json | null
          success_rate: number | null
          topic_category: string
          topic_name: string
          update_frequency_hours: number | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          knowledge_depth?: string | null
          last_updated_at?: string | null
          priority_level?: number
          search_keywords?: Json | null
          success_rate?: number | null
          topic_category: string
          topic_name: string
          update_frequency_hours?: number | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          knowledge_depth?: string | null
          last_updated_at?: string | null
          priority_level?: number
          search_keywords?: Json | null
          success_rate?: number | null
          topic_category?: string
          topic_name?: string
          update_frequency_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cron_job_stats: {
        Row: {
          batch_size: number
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          job_name: string
          job_params: Json | null
          products_failed: number
          products_imported: number
          products_skipped: number
          strategy: string
          success: boolean
        }
        Insert: {
          batch_size?: number
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name: string
          job_params?: Json | null
          products_failed?: number
          products_imported?: number
          products_skipped?: number
          strategy: string
          success?: boolean
        }
        Update: {
          batch_size?: number
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name?: string
          job_params?: Json | null
          products_failed?: number
          products_imported?: number
          products_skipped?: number
          strategy?: string
          success?: boolean
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
      email_campaigns: {
        Row: {
          campaign_type: string
          clicked_count: number | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          opened_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          target_audience: Json | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          campaign_type: string
          clicked_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          target_audience?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          clicked_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          target_audience?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          email_address: string
          email_type: string
          external_id: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          email_address: string
          email_type: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status: string
          subject: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          email_address?: string
          email_type?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          text_content: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          text_content?: string | null
          updated_at?: string
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
      feature_requests: {
        Row: {
          category: string
          created_at: string
          description: string
          estimated_effort: string | null
          id: string
          implementation_notes: string | null
          priority: string
          status: string
          target_version: string | null
          title: string
          updated_at: string
          user_id: string
          vote_count: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          estimated_effort?: string | null
          id?: string
          implementation_notes?: string | null
          priority?: string
          status?: string
          target_version?: string | null
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          estimated_effort?: string | null
          id?: string
          implementation_notes?: string | null
          priority?: string
          status?: string
          target_version?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: []
      }
      feature_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      fluid_database: {
        Row: {
          alcohol_percentage: number | null
          calories_per_100ml: number | null
          category: string
          created_at: string
          default_amount: number | null
          description: string | null
          has_alcohol: boolean | null
          has_caffeine: boolean | null
          icon_name: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          alcohol_percentage?: number | null
          calories_per_100ml?: number | null
          category: string
          created_at?: string
          default_amount?: number | null
          description?: string | null
          has_alcohol?: boolean | null
          has_caffeine?: boolean | null
          icon_name?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          alcohol_percentage?: number | null
          calories_per_100ml?: number | null
          category?: string
          created_at?: string
          default_amount?: number | null
          description?: string | null
          has_alcohol?: boolean | null
          has_caffeine?: boolean | null
          icon_name?: string | null
          id?: string
          name?: string
          updated_at?: string
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
      knowledge_base_embeddings: {
        Row: {
          chunk_index: number
          content_chunk: string
          created_at: string
          embedding: string | null
          id: string
          knowledge_id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          chunk_index?: number
          content_chunk: string
          created_at?: string
          embedding?: string | null
          id?: string
          knowledge_id: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content_chunk?: string
          created_at?: string
          embedding?: string | null
          id?: string
          knowledge_id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_embeddings_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "coach_knowledge_base"
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
          consumption_percentage: number | null
          created_at: string
          evaluation_criteria: Json | null
          fats: number | null
          id: string
          images: string[] | null
          leftover_analysis_metadata: Json | null
          leftover_images: string[] | null
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
          consumption_percentage?: number | null
          created_at?: string
          evaluation_criteria?: Json | null
          fats?: number | null
          id?: string
          images?: string[] | null
          leftover_analysis_metadata?: Json | null
          leftover_images?: string[] | null
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
          consumption_percentage?: number | null
          created_at?: string
          evaluation_criteria?: Json | null
          fats?: number | null
          id?: string
          images?: string[] | null
          leftover_analysis_metadata?: Json | null
          leftover_images?: string[] | null
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
      onboarding_sequences: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          next_email_at: string | null
          paused: boolean | null
          sequence_step: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          next_email_at?: string | null
          paused?: boolean | null
          sequence_step?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          next_email_at?: string | null
          paused?: boolean | null
          sequence_step?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_automation_config: {
        Row: {
          active_topics: Json | null
          coach_id: string | null
          config_data: Json | null
          created_at: string
          failure_count: number
          id: string
          interval_minutes: number
          is_enabled: boolean
          knowledge_areas: Json | null
          last_run_at: string | null
          max_entries_per_run: number
          max_failures: number
          next_run_at: string | null
          pipeline_name: string
          priority_weights: Json | null
          topic_rotation_strategy: string | null
          updated_at: string
        }
        Insert: {
          active_topics?: Json | null
          coach_id?: string | null
          config_data?: Json | null
          created_at?: string
          failure_count?: number
          id?: string
          interval_minutes?: number
          is_enabled?: boolean
          knowledge_areas?: Json | null
          last_run_at?: string | null
          max_entries_per_run?: number
          max_failures?: number
          next_run_at?: string | null
          pipeline_name: string
          priority_weights?: Json | null
          topic_rotation_strategy?: string | null
          updated_at?: string
        }
        Update: {
          active_topics?: Json | null
          coach_id?: string | null
          config_data?: Json | null
          created_at?: string
          failure_count?: number
          id?: string
          interval_minutes?: number
          is_enabled?: boolean
          knowledge_areas?: Json | null
          last_run_at?: string | null
          max_entries_per_run?: number
          max_failures?: number
          next_run_at?: string | null
          pipeline_name?: string
          priority_weights?: Json | null
          topic_rotation_strategy?: string | null
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
      proactive_messages: {
        Row: {
          coach_personality: string
          id: string
          message_content: string
          message_type: string
          read_at: string | null
          sent_at: string
          trigger_reason: string
          user_id: string
        }
        Insert: {
          coach_personality: string
          id?: string
          message_content: string
          message_type: string
          read_at?: string | null
          sent_at?: string
          trigger_reason: string
          user_id: string
        }
        Update: {
          coach_personality?: string
          id?: string
          message_content?: string
          message_type?: string
          read_at?: string | null
          sent_at?: string
          trigger_reason?: string
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
      rag_performance_metrics: {
        Row: {
          cache_hit: boolean | null
          coach_id: string
          created_at: string
          embedding_tokens: number | null
          id: string
          query_text: string
          relevance_score: number | null
          response_time_ms: number
          search_method: string
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          cache_hit?: boolean | null
          coach_id: string
          created_at?: string
          embedding_tokens?: number | null
          id?: string
          query_text: string
          relevance_score?: number | null
          response_time_ms: number
          search_method: string
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          cache_hit?: boolean | null
          coach_id?: string
          created_at?: string
          embedding_tokens?: number | null
          id?: string
          query_text?: string
          relevance_score?: number | null
          response_time_ms?: number
          search_method?: string
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          category: string
          completion_percentage: number | null
          created_at: string
          description: string
          estimated_completion: string | null
          feature_request_id: string | null
          id: string
          is_public: boolean
          priority: string
          status: string
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          category: string
          completion_percentage?: number | null
          created_at?: string
          description: string
          estimated_completion?: string | null
          feature_request_id?: string | null
          id?: string
          is_public?: boolean
          priority?: string
          status: string
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string
          completion_percentage?: number | null
          created_at?: string
          description?: string
          estimated_completion?: string | null
          feature_request_id?: string | null
          id?: string
          is_public?: boolean
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_formchecks: {
        Row: {
          coach_analysis: string
          created_at: string
          exercise_name: string
          form_rating: number | null
          id: string
          improvement_tips: string[]
          key_points: string[]
          media_urls: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_analysis: string
          created_at?: string
          exercise_name: string
          form_rating?: number | null
          id?: string
          improvement_tips?: string[]
          key_points?: string[]
          media_urls?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_analysis?: string
          created_at?: string
          exercise_name?: string
          form_rating?: number | null
          id?: string
          improvement_tips?: string[]
          key_points?: string[]
          media_urls?: string[]
          updated_at?: string
          user_id?: string
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
      semantic_query_cache: {
        Row: {
          cached_results: Json
          created_at: string
          hit_count: number
          id: string
          last_used_at: string
          query_embedding: string | null
          query_text: string
        }
        Insert: {
          cached_results?: Json
          created_at?: string
          hit_count?: number
          id?: string
          last_used_at?: string
          query_embedding?: string | null
          query_text: string
        }
        Update: {
          cached_results?: Json
          created_at?: string
          hit_count?: number
          id?: string
          last_used_at?: string
          query_embedding?: string | null
          query_text?: string
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
      supplement_database: {
        Row: {
          category: string
          common_timing: string[] | null
          created_at: string
          default_dosage: string | null
          default_unit: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          common_timing?: string[] | null
          created_at?: string
          default_dosage?: string | null
          default_unit?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          common_timing?: string[] | null
          created_at?: string
          default_dosage?: string | null
          default_unit?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplement_intake_log: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          taken: boolean
          timing: string
          updated_at: string
          user_id: string
          user_supplement_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          taken?: boolean
          timing: string
          updated_at?: string
          user_id: string
          user_supplement_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          taken?: boolean
          timing?: string
          updated_at?: string
          user_id?: string
          user_supplement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_intake_log_user_supplement_id_fkey"
            columns: ["user_supplement_id"]
            isOneToOne: false
            referencedRelation: "user_supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alcohol_abstinence: {
        Row: {
          abstinence_reason: string | null
          abstinence_start_date: string | null
          created_at: string
          id: string
          is_abstinent: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abstinence_reason?: string | null
          abstinence_start_date?: string | null
          created_at?: string
          id?: string
          is_abstinent?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abstinence_reason?: string | null
          abstinence_start_date?: string | null
          created_at?: string
          id?: string
          is_abstinent?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_email_preferences: {
        Row: {
          activity_reminders: boolean | null
          created_at: string
          double_opt_in_confirmed: boolean | null
          double_opt_in_expires_at: string | null
          double_opt_in_token: string | null
          id: string
          marketing_emails: boolean | null
          newsletter_enabled: boolean | null
          onboarding_emails: boolean | null
          unsubscribe_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_reminders?: boolean | null
          created_at?: string
          double_opt_in_confirmed?: boolean | null
          double_opt_in_expires_at?: string | null
          double_opt_in_token?: string | null
          id?: string
          marketing_emails?: boolean | null
          newsletter_enabled?: boolean | null
          onboarding_emails?: boolean | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_reminders?: boolean | null
          created_at?: string
          double_opt_in_confirmed?: boolean | null
          double_opt_in_expires_at?: string | null
          double_opt_in_token?: string | null
          id?: string
          marketing_emails?: boolean | null
          newsletter_enabled?: boolean | null
          onboarding_emails?: boolean | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_fluids: {
        Row: {
          amount_ml: number
          consumed_at: string
          created_at: string
          custom_name: string | null
          date: string
          fluid_id: string | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          consumed_at?: string
          created_at?: string
          custom_name?: string | null
          date?: string
          fluid_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          consumed_at?: string
          created_at?: string
          custom_name?: string | null
          date?: string
          fluid_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fluids_fluid_id_fkey"
            columns: ["fluid_id"]
            isOneToOne: false
            referencedRelation: "fluid_database"
            referencedColumns: ["id"]
          },
        ]
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
      user_supplements: {
        Row: {
          created_at: string
          custom_name: string | null
          dosage: string
          frequency_days: number | null
          goal: string | null
          id: string
          is_active: boolean
          notes: string | null
          rating: number | null
          supplement_id: string | null
          timing: string[]
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          dosage: string
          frequency_days?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          rating?: number | null
          supplement_id?: string | null
          timing?: string[]
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          dosage?: string
          frequency_days?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          rating?: number | null
          supplement_id?: string | null
          timing?: string[]
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_supplements_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplement_database"
            referencedColumns: ["id"]
          },
        ]
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
      get_or_cache_query_embedding: {
        Args: { query_text: string; query_embedding: string }
        Returns: string
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
      search_knowledge_hybrid: {
        Args: {
          query_text: string
          query_embedding: string
          coach_filter?: string
          semantic_weight?: number
          text_weight?: number
          match_count?: number
        }
        Returns: {
          knowledge_id: string
          content_chunk: string
          combined_score: number
          semantic_score: number
          text_score: number
          title: string
          expertise_area: string
          coach_id: string
        }[]
      }
      search_knowledge_semantic: {
        Args: {
          query_embedding: string
          coach_filter?: string
          similarity_threshold?: number
          match_count?: number
        }
        Returns: {
          knowledge_id: string
          content_chunk: string
          similarity: number
          title: string
          expertise_area: string
          coach_id: string
          chunk_index: number
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
