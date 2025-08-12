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
      admin_conversation_notes: {
        Row: {
          admin_user_id: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          note: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          note: string
          status: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      ai_credits_usage: {
        Row: {
          cost: number
          created_at: string
          credits_after: number
          credits_before: number
          feature_type: string
          id: string
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          credits_after: number
          credits_before: number
          feature_type: string
          id?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          credits_after?: number
          credits_before?: number
          feature_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_costs: {
        Row: {
          cost: number
          created_at: string
          feature_type: string
          updated_at: string
        }
        Insert: {
          cost: number
          created_at?: string
          feature_type: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          feature_type?: string
          updated_at?: string
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
      ai_usage_tracking: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          id: string
          request_metadata: Json | null
          service_type: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          request_metadata?: Json | null
          service_type: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          request_metadata?: Json | null
          service_type?: string
          tokens_used?: number | null
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
      body_analysis_log: {
        Row: {
          analysis_result: Json
          created_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          analysis_result: Json
          created_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          analysis_result?: Json
          created_at?: string
          id?: string
          image_url?: string
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
      chat_history: {
        Row: {
          coach_personality: string
          content: string
          created_at: string
          id: string
          images: string[] | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_personality?: string
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_personality?: string
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_events: {
        Row: {
          client_event_id: string
          created_at: string
          last_reply: Json | null
          status: Database["public"]["Enums"]["client_event_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_event_id: string
          created_at?: string
          last_reply?: Json | null
          status?: Database["public"]["Enums"]["client_event_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_event_id?: string
          created_at?: string
          last_reply?: Json | null
          status?: Database["public"]["Enums"]["client_event_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_chat_memory: {
        Row: {
          coach_id: string
          convo_id: string
          created_at: string
          last_messages: Json
          message_count: number
          rolling_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          convo_id: string
          created_at?: string
          last_messages?: Json
          message_count?: number
          rolling_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          convo_id?: string
          created_at?: string
          last_messages?: Json
          message_count?: number
          rolling_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_chat_packets: {
        Row: {
          convo_id: string
          created_at: string
          from_msg: number
          id: number
          message_count: number
          packet_summary: string
          to_msg: number
        }
        Insert: {
          convo_id: string
          created_at?: string
          from_msg: number
          id?: number
          message_count: number
          packet_summary: string
          to_msg: number
        }
        Update: {
          convo_id?: string
          created_at?: string
          from_msg?: number
          id?: number
          message_count?: number
          packet_summary?: string
          to_msg?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_chat_packets_convo_id_fkey"
            columns: ["convo_id"]
            isOneToOne: false
            referencedRelation: "coach_chat_memory"
            referencedColumns: ["convo_id"]
          },
        ]
      }
      coach_conversation_memory: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          last_updated: string
          rolling_summary: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          last_updated?: string
          rolling_summary?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          last_updated?: string
          rolling_summary?: string | null
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
      coach_personas: {
        Row: {
          bio_short: string | null
          catchphrase: string | null
          created_at: string
          emojis: Json
          id: string
          name: string
          sign_off: string | null
          style_rules: Json
          title: string | null
          updated_at: string
          voice: string | null
        }
        Insert: {
          bio_short?: string | null
          catchphrase?: string | null
          created_at?: string
          emojis?: Json
          id: string
          name: string
          sign_off?: string | null
          style_rules?: Json
          title?: string | null
          updated_at?: string
          voice?: string | null
        }
        Update: {
          bio_short?: string | null
          catchphrase?: string | null
          created_at?: string
          emojis?: Json
          id?: string
          name?: string
          sign_off?: string | null
          style_rules?: Json
          title?: string | null
          updated_at?: string
          voice?: string | null
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
      coach_plans: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          json_payload: Json | null
          status: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          json_payload?: Json | null
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          json_payload?: Json | null
          status?: string
          title?: string | null
          type?: string
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
      coach_trace_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          data: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          message_id: string | null
          status: string
          step: string
          trace_id: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          status?: string
          step: string
          trace_id: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          status?: string
          step?: string
          trace_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_traces: {
        Row: {
          data: Json | null
          id: number
          stage: string
          trace_id: string
          ts: string
        }
        Insert: {
          data?: Json | null
          id?: never
          stage: string
          trace_id: string
          ts?: string
        }
        Update: {
          data?: Json | null
          id?: never
          stage?: string
          trace_id?: string
          ts?: string
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          created_at: string
          emotional_tone: string | null
          id: string
          key_topics: string[] | null
          message_count: number
          progress_notes: string | null
          summary_content: string
          summary_period_end: string
          summary_period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotional_tone?: string | null
          id?: string
          key_topics?: string[] | null
          message_count?: number
          progress_notes?: string | null
          summary_content: string
          summary_period_end: string
          summary_period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotional_tone?: string | null
          id?: string
          key_topics?: string[] | null
          message_count?: number
          progress_notes?: string | null
          summary_content?: string
          summary_period_end?: string
          summary_period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_payments_log: {
        Row: {
          amount_cents: number
          created_at: string
          credits: number
          pack: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          credits: number
          pack: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          credits?: number
          pack?: string
          session_id?: string
          status?: string
          user_id?: string
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
      cycle_assessments: {
        Row: {
          created_at: string
          current_phase: string
          cycle_length: number
          date: string
          energy_level: number
          id: string
          last_period_date: string | null
          mood_assessment: string
          phase_day: number
          symptoms: string[]
          training_readiness: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: string
          cycle_length?: number
          date?: string
          energy_level?: number
          id?: string
          last_period_date?: string | null
          mood_assessment?: string
          phase_day?: number
          symptoms?: string[]
          training_readiness?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: string
          cycle_length?: number
          date?: string
          energy_level?: number
          id?: string
          last_period_date?: string | null
          mood_assessment?: string
          phase_day?: number
          symptoms?: string[]
          training_readiness?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activities: {
        Row: {
          activity_minutes: number | null
          calories_burned: number | null
          created_at: string
          date: string
          distance_km: number | null
          floors_climbed: number | null
          heart_rate_avg: number | null
          id: string
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_minutes?: number | null
          calories_burned?: number | null
          created_at?: string
          date: string
          distance_km?: number | null
          floors_climbed?: number | null
          heart_rate_avg?: number | null
          id?: string
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_minutes?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          floors_climbed?: number | null
          heart_rate_avg?: number | null
          id?: string
          steps?: number | null
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
      daily_summaries: {
        Row: {
          created_at: string
          date: string
          hydration_score: number | null
          id: string
          kpi_xxl_json: Json | null
          macro_distribution: Json | null
          mindset_data: Json
          recovery_metrics: Json | null
          schema_version: string | null
          sleep_score: number | null
          summary_md: string | null
          summary_struct_json: Json | null
          summary_xl_md: string | null
          summary_xxl_md: string | null
          text_generated: boolean | null
          tokens_spent: number | null
          top_foods: Json | null
          total_calories: number | null
          total_carbs: number | null
          total_fats: number | null
          total_protein: number | null
          updated_at: string
          user_id: string
          workout_muscle_groups: string[] | null
          workout_volume: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          hydration_score?: number | null
          id?: string
          kpi_xxl_json?: Json | null
          macro_distribution?: Json | null
          mindset_data?: Json
          recovery_metrics?: Json | null
          schema_version?: string | null
          sleep_score?: number | null
          summary_md?: string | null
          summary_struct_json?: Json | null
          summary_xl_md?: string | null
          summary_xxl_md?: string | null
          text_generated?: boolean | null
          tokens_spent?: number | null
          top_foods?: Json | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id: string
          workout_muscle_groups?: string[] | null
          workout_volume?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          hydration_score?: number | null
          id?: string
          kpi_xxl_json?: Json | null
          macro_distribution?: Json | null
          mindset_data?: Json
          recovery_metrics?: Json | null
          schema_version?: string | null
          sleep_score?: number | null
          summary_md?: string | null
          summary_struct_json?: Json | null
          summary_xl_md?: string | null
          summary_xxl_md?: string | null
          text_generated?: boolean | null
          tokens_spent?: number | null
          top_foods?: Json | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id?: string
          workout_muscle_groups?: string[] | null
          workout_volume?: number | null
        }
        Relationships: []
      }
      daily_token_spend: {
        Row: {
          created_at: string | null
          credits_used: number | null
          date: string
          id: string
          operation_type: string
          tokens_spent: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          date?: string
          id?: string
          operation_type?: string
          tokens_spent?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          date?: string
          id?: string
          operation_type?: string
          tokens_spent?: number | null
          user_id?: string
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          assistant_msg: string
          coach_id: string
          created_at: string
          id: string
          tokens: number | null
          user_id: string
          user_msg: string
        }
        Insert: {
          assistant_msg: string
          coach_id: string
          created_at?: string
          id?: string
          tokens?: number | null
          user_id: string
          user_msg: string
        }
        Update: {
          assistant_msg?: string
          coach_id?: string
          created_at?: string
          id?: string
          tokens?: number | null
          user_id?: string
          user_msg?: string
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
      diary_entries: {
        Row: {
          client_event_id: string | null
          content: string
          created_at: string
          date: string
          entry_type: string | null
          id: string
          mood: string | null
          prompt_used: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_event_id?: string | null
          content: string
          created_at?: string
          date: string
          entry_type?: string | null
          id?: string
          mood?: string | null
          prompt_used?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_event_id?: string | null
          content?: string
          created_at?: string
          date?: string
          entry_type?: string | null
          id?: string
          mood?: string | null
          prompt_used?: string | null
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
      embedding_generation_jobs: {
        Row: {
          batch_size: number
          completed_at: string | null
          created_at: string | null
          current_batch: number
          error_message: string | null
          failed_entries: number
          id: string
          last_batch_at: string | null
          metadata: Json | null
          processed_entries: number
          started_at: string | null
          status: string
          total_entries: number
          updated_at: string | null
        }
        Insert: {
          batch_size?: number
          completed_at?: string | null
          created_at?: string | null
          current_batch?: number
          error_message?: string | null
          failed_entries?: number
          id?: string
          last_batch_at?: string | null
          metadata?: Json | null
          processed_entries?: number
          started_at?: string | null
          status?: string
          total_entries?: number
          updated_at?: string | null
        }
        Update: {
          batch_size?: number
          completed_at?: string | null
          created_at?: string | null
          current_batch?: number
          error_message?: string | null
          failed_entries?: number
          id?: string
          last_batch_at?: string | null
          metadata?: Json | null
          processed_entries?: number
          started_at?: string | null
          status?: string
          total_entries?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      exercise_sessions: {
        Row: {
          coach_persona: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          metadata: Json
          notes: string | null
          overall_rpe: number | null
          session_name: string | null
          start_time: string | null
          updated_at: string
          user_id: string
          workout_id: string | null
          workout_plan_id: string | null
          workout_type: string | null
        }
        Insert: {
          coach_persona?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          overall_rpe?: number | null
          session_name?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
          workout_id?: string | null
          workout_plan_id?: string | null
          workout_type?: string | null
        }
        Update: {
          coach_persona?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          overall_rpe?: number | null
          session_name?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
          workout_id?: string | null
          workout_plan_id?: string | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          client_event_id: string | null
          created_at: string
          date: string | null
          distance_m: number | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          origin: string | null
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
          client_event_id?: string | null
          created_at?: string
          date?: string | null
          distance_m?: number | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          origin?: string | null
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
          client_event_id?: string | null
          created_at?: string
          date?: string | null
          distance_m?: number | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          origin?: string | null
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
      feature_flags: {
        Row: {
          created_at: string
          enabled_default: boolean
          flag_description: string | null
          flag_name: string
          id: string
          is_enabled: boolean
          key: string | null
          metadata: Json | null
          rollout_percentage: number
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_default?: boolean
          flag_description?: string | null
          flag_name: string
          id?: string
          is_enabled?: boolean
          key?: string | null
          metadata?: Json | null
          rollout_percentage?: number
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_default?: boolean
          flag_description?: string | null
          flag_name?: string
          id?: string
          is_enabled?: boolean
          key?: string | null
          metadata?: Json | null
          rollout_percentage?: number
          target_audience?: Json | null
          updated_at?: string
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
      female_periodization_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          plan_data: Json
          updated_at: string
          user_id: string
          user_preferences: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          updated_at?: string
          user_id: string
          user_preferences?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          updated_at?: string
          user_id?: string
          user_preferences?: Json
        }
        Relationships: []
      }
      fluid_database: {
        Row: {
          alcohol_percentage: number | null
          calories_per_100ml: number | null
          carbs_per_100ml: number | null
          category: string
          created_at: string
          default_amount: number | null
          description: string | null
          fats_per_100ml: number | null
          has_alcohol: boolean | null
          has_caffeine: boolean | null
          icon_name: string | null
          id: string
          name: string
          protein_per_100ml: number | null
          updated_at: string
        }
        Insert: {
          alcohol_percentage?: number | null
          calories_per_100ml?: number | null
          carbs_per_100ml?: number | null
          category: string
          created_at?: string
          default_amount?: number | null
          description?: string | null
          fats_per_100ml?: number | null
          has_alcohol?: boolean | null
          has_caffeine?: boolean | null
          icon_name?: string | null
          id?: string
          name: string
          protein_per_100ml?: number | null
          updated_at?: string
        }
        Update: {
          alcohol_percentage?: number | null
          calories_per_100ml?: number | null
          carbs_per_100ml?: number | null
          category?: string
          created_at?: string
          default_amount?: number | null
          description?: string | null
          fats_per_100ml?: number | null
          has_alcohol?: boolean | null
          has_caffeine?: boolean | null
          icon_name?: string | null
          id?: string
          name?: string
          protein_per_100ml?: number | null
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
      hormone_tracking: {
        Row: {
          cravings: string[]
          created_at: string
          date: string
          energy_level: number
          id: string
          libido_level: number
          notes: string | null
          pain_level: number
          skin_condition: string
          sleep_quality: number
          stress_level: number
          symptoms: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          cravings?: string[]
          created_at?: string
          date?: string
          energy_level?: number
          id?: string
          libido_level?: number
          notes?: string | null
          pain_level?: number
          skin_condition?: string
          sleep_quality?: number
          stress_level?: number
          symptoms?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          cravings?: string[]
          created_at?: string
          date?: string
          energy_level?: number
          id?: string
          libido_level?: number
          notes?: string | null
          pain_level?: number
          skin_condition?: string
          sleep_quality?: number
          stress_level?: number
          symptoms?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_daily_summaries: {
        Row: {
          ai_summary: string | null
          avg_wellness_score: number | null
          created_at: string
          date: string
          dominant_emotions: Json | null
          id: string
          key_themes: string[] | null
          photo_highlights: Json | null
          total_entries: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          avg_wellness_score?: number | null
          created_at?: string
          date: string
          dominant_emotions?: Json | null
          id?: string
          key_themes?: string[] | null
          photo_highlights?: Json | null
          total_entries?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          avg_wellness_score?: number | null
          created_at?: string
          date?: string
          dominant_emotions?: Json | null
          id?: string
          key_themes?: string[] | null
          photo_highlights?: Json | null
          total_entries?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          ai_analysis_metadata: Json | null
          ai_summary_md: string | null
          audio_url: string | null
          challenge: string | null
          created_at: string
          date: string
          emotional_scores: Json | null
          energy_level: number | null
          entry_sequence_number: number | null
          gratitude_items: string[] | null
          highlight: string | null
          id: string
          kai_insight: string | null
          manifestation_items: string[] | null
          mood_score: number | null
          photo_analysis: Json | null
          photo_url: string | null
          prompt_used: string | null
          quadrant_analysis: Json | null
          raw_text: string | null
          sentiment_tag: string | null
          stress_indicators: string[] | null
          timestamp: string | null
          transformation_themes: string[] | null
          updated_at: string
          user_id: string
          wellness_score: number | null
        }
        Insert: {
          ai_analysis_metadata?: Json | null
          ai_summary_md?: string | null
          audio_url?: string | null
          challenge?: string | null
          created_at?: string
          date: string
          emotional_scores?: Json | null
          energy_level?: number | null
          entry_sequence_number?: number | null
          gratitude_items?: string[] | null
          highlight?: string | null
          id?: string
          kai_insight?: string | null
          manifestation_items?: string[] | null
          mood_score?: number | null
          photo_analysis?: Json | null
          photo_url?: string | null
          prompt_used?: string | null
          quadrant_analysis?: Json | null
          raw_text?: string | null
          sentiment_tag?: string | null
          stress_indicators?: string[] | null
          timestamp?: string | null
          transformation_themes?: string[] | null
          updated_at?: string
          user_id: string
          wellness_score?: number | null
        }
        Update: {
          ai_analysis_metadata?: Json | null
          ai_summary_md?: string | null
          audio_url?: string | null
          challenge?: string | null
          created_at?: string
          date?: string
          emotional_scores?: Json | null
          energy_level?: number | null
          entry_sequence_number?: number | null
          gratitude_items?: string[] | null
          highlight?: string | null
          id?: string
          kai_insight?: string | null
          manifestation_items?: string[] | null
          mood_score?: number | null
          photo_analysis?: Json | null
          photo_url?: string | null
          prompt_used?: string | null
          quadrant_analysis?: Json | null
          raw_text?: string | null
          sentiment_tag?: string | null
          stress_indicators?: string[] | null
          timestamp?: string | null
          transformation_themes?: string[] | null
          updated_at?: string
          user_id?: string
          wellness_score?: number | null
        }
        Relationships: []
      }
      journal_monthly_summaries: {
        Row: {
          created_at: string
          development_insights: string | null
          entries_count: number | null
          id: string
          life_areas_progress: Json | null
          month: string
          photo_memory_highlights: Json | null
          transformation_themes: string[] | null
          updated_at: string
          user_id: string
          wellness_index: number | null
        }
        Insert: {
          created_at?: string
          development_insights?: string | null
          entries_count?: number | null
          id?: string
          life_areas_progress?: Json | null
          month: string
          photo_memory_highlights?: Json | null
          transformation_themes?: string[] | null
          updated_at?: string
          user_id: string
          wellness_index?: number | null
        }
        Update: {
          created_at?: string
          development_insights?: string | null
          entries_count?: number | null
          id?: string
          life_areas_progress?: Json | null
          month?: string
          photo_memory_highlights?: Json | null
          transformation_themes?: string[] | null
          updated_at?: string
          user_id?: string
          wellness_index?: number | null
        }
        Relationships: []
      }
      journal_photo_analyses: {
        Row: {
          ai_interpretation: string | null
          color_palette: Json | null
          confidence_score: number | null
          created_at: string
          detected_objects: Json | null
          id: string
          journal_entry_id: string
          memory_tags: string[] | null
          mood_analysis: Json | null
          photo_url: string
          scene_description: string | null
        }
        Insert: {
          ai_interpretation?: string | null
          color_palette?: Json | null
          confidence_score?: number | null
          created_at?: string
          detected_objects?: Json | null
          id?: string
          journal_entry_id: string
          memory_tags?: string[] | null
          mood_analysis?: Json | null
          photo_url: string
          scene_description?: string | null
        }
        Update: {
          ai_interpretation?: string | null
          color_palette?: Json | null
          confidence_score?: number | null
          created_at?: string
          detected_objects?: Json | null
          id?: string
          journal_entry_id?: string
          memory_tags?: string[] | null
          mood_analysis?: Json | null
          photo_url?: string
          scene_description?: string | null
        }
        Relationships: []
      }
      journal_weekly_summaries: {
        Row: {
          achievements: string[] | null
          ai_insights: string | null
          created_at: string
          entries_count: number | null
          growth_areas: string[] | null
          id: string
          pattern_insights: Json | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
          wellness_trend: number | null
        }
        Insert: {
          achievements?: string[] | null
          ai_insights?: string | null
          created_at?: string
          entries_count?: number | null
          growth_areas?: string[] | null
          id?: string
          pattern_insights?: Json | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
          wellness_trend?: number | null
        }
        Update: {
          achievements?: string[] | null
          ai_insights?: string | null
          created_at?: string
          entries_count?: number | null
          growth_areas?: string[] | null
          id?: string
          pattern_insights?: Json | null
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
          wellness_trend?: number | null
        }
        Relationships: []
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
        }
        Insert: {
          chunk_index?: number
          content_chunk: string
          created_at?: string
          embedding?: string | null
          id?: string
          knowledge_id: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content_chunk?: string
          created_at?: string
          embedding?: string | null
          id?: string
          knowledge_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_embeddings_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "coach_knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_embeddings_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "v_vita_knowledge_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_catalog: {
        Row: {
          created_at: string | null
          data: Json
          date: string
          generated_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          date: string
          generated_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          date?: string
          generated_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      markus_competition_prep: {
        Row: {
          body_fat_percentage: number | null
          cardio_minutes_per_day: number | null
          coach_notes: string | null
          competition_date: string
          competition_name: string
          condition_rating: number | null
          created_at: string
          current_weight_kg: number | null
          daily_calories: number | null
          daily_carbs_grams: number | null
          daily_fats_grams: number | null
          daily_protein_grams: number | null
          energy_level: number | null
          hunger_level: number | null
          id: string
          markus_feedback: string | null
          peak_week_protocol: Json | null
          prep_phase: string
          supplements: Json | null
          target_weight_kg: number | null
          training_frequency_per_week: number | null
          updated_at: string
          user_id: string
          weeks_out: number
        }
        Insert: {
          body_fat_percentage?: number | null
          cardio_minutes_per_day?: number | null
          coach_notes?: string | null
          competition_date: string
          competition_name: string
          condition_rating?: number | null
          created_at?: string
          current_weight_kg?: number | null
          daily_calories?: number | null
          daily_carbs_grams?: number | null
          daily_fats_grams?: number | null
          daily_protein_grams?: number | null
          energy_level?: number | null
          hunger_level?: number | null
          id?: string
          markus_feedback?: string | null
          peak_week_protocol?: Json | null
          prep_phase: string
          supplements?: Json | null
          target_weight_kg?: number | null
          training_frequency_per_week?: number | null
          updated_at?: string
          user_id: string
          weeks_out: number
        }
        Update: {
          body_fat_percentage?: number | null
          cardio_minutes_per_day?: number | null
          coach_notes?: string | null
          competition_date?: string
          competition_name?: string
          condition_rating?: number | null
          created_at?: string
          current_weight_kg?: number | null
          daily_calories?: number | null
          daily_carbs_grams?: number | null
          daily_fats_grams?: number | null
          daily_protein_grams?: number | null
          energy_level?: number | null
          hunger_level?: number | null
          id?: string
          markus_feedback?: string | null
          peak_week_protocol?: Json | null
          prep_phase?: string
          supplements?: Json | null
          target_weight_kg?: number | null
          training_frequency_per_week?: number | null
          updated_at?: string
          user_id?: string
          weeks_out?: number
        }
        Relationships: []
      }
      markus_heavy_training_sessions: {
        Row: {
          created_at: string
          date: string
          exercise_type: string
          id: string
          is_personal_record: boolean | null
          notes: string | null
          reps: number
          rest_between_sets_seconds: number | null
          rpe: number | null
          sets: number
          training_intensity: string
          updated_at: string
          user_id: string
          warmup_sets: Json | null
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date?: string
          exercise_type: string
          id?: string
          is_personal_record?: boolean | null
          notes?: string | null
          reps: number
          rest_between_sets_seconds?: number | null
          rpe?: number | null
          sets: number
          training_intensity?: string
          updated_at?: string
          user_id: string
          warmup_sets?: Json | null
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          exercise_type?: string
          id?: string
          is_personal_record?: boolean | null
          notes?: string | null
          reps?: number
          rest_between_sets_seconds?: number | null
          rpe?: number | null
          sets?: number
          training_intensity?: string
          updated_at?: string
          user_id?: string
          warmup_sets?: Json | null
          weight_kg?: number
        }
        Relationships: []
      }
      markus_mass_progress: {
        Row: {
          body_fat_percentage: number | null
          body_weight_kg: number | null
          created_at: string
          daily_calories: number | null
          daily_protein_grams: number | null
          date: string
          id: string
          markus_rating: number | null
          measurements: Json | null
          muscle_mass_kg: number | null
          notes: string | null
          progress_photos: string[] | null
          strength_indicators: Json | null
          training_volume_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_fat_percentage?: number | null
          body_weight_kg?: number | null
          created_at?: string
          daily_calories?: number | null
          daily_protein_grams?: number | null
          date?: string
          id?: string
          markus_rating?: number | null
          measurements?: Json | null
          muscle_mass_kg?: number | null
          notes?: string | null
          progress_photos?: string[] | null
          strength_indicators?: Json | null
          training_volume_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_fat_percentage?: number | null
          body_weight_kg?: number | null
          created_at?: string
          daily_calories?: number | null
          daily_protein_grams?: number | null
          date?: string
          id?: string
          markus_rating?: number | null
          measurements?: Json | null
          muscle_mass_kg?: number | null
          notes?: string | null
          progress_photos?: string[] | null
          strength_indicators?: Json | null
          training_volume_kg?: number | null
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
          client_event_id: string | null
          consumption_percentage: number | null
          created_at: string
          date: string | null
          evaluation_criteria: Json | null
          fats: number | null
          id: string
          image_meta: Json | null
          images: string[] | null
          leftover_analysis_metadata: Json | null
          leftover_images: string[] | null
          meal_type: string | null
          protein: number | null
          quality_score: number | null
          text: string
          title: string | null
          ts: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          bonus_points?: number | null
          calories?: number | null
          carbs?: number | null
          client_event_id?: string | null
          consumption_percentage?: number | null
          created_at?: string
          date?: string | null
          evaluation_criteria?: Json | null
          fats?: number | null
          id?: string
          image_meta?: Json | null
          images?: string[] | null
          leftover_analysis_metadata?: Json | null
          leftover_images?: string[] | null
          meal_type?: string | null
          protein?: number | null
          quality_score?: number | null
          text: string
          title?: string | null
          ts?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          bonus_points?: number | null
          calories?: number | null
          carbs?: number | null
          client_event_id?: string | null
          consumption_percentage?: number | null
          created_at?: string
          date?: string | null
          evaluation_criteria?: Json | null
          fats?: number | null
          id?: string
          image_meta?: Json | null
          images?: string[] | null
          leftover_analysis_metadata?: Json | null
          leftover_images?: string[] | null
          meal_type?: string | null
          protein?: number | null
          quality_score?: number | null
          text?: string
          title?: string | null
          ts?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_conditions_library: {
        Row: {
          category: string
          contraindications: string[] | null
          created_at: string
          fitness_considerations: string | null
          id: string
          name: string
          risk_level: string
          updated_at: string
        }
        Insert: {
          category: string
          contraindications?: string[] | null
          created_at?: string
          fitness_considerations?: string | null
          id?: string
          name: string
          risk_level?: string
          updated_at?: string
        }
        Update: {
          category?: string
          contraindications?: string[] | null
          created_at?: string
          fitness_considerations?: string | null
          id?: string
          name?: string
          risk_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      medications_library: {
        Row: {
          active_ingredient: string | null
          category: string
          created_at: string
          exercise_interactions: string[] | null
          fitness_considerations: string | null
          id: string
          name: string
          nutrition_interactions: string[] | null
          risk_level: string
          updated_at: string
        }
        Insert: {
          active_ingredient?: string | null
          category: string
          created_at?: string
          exercise_interactions?: string[] | null
          fitness_considerations?: string | null
          id?: string
          name: string
          nutrition_interactions?: string[] | null
          risk_level?: string
          updated_at?: string
        }
        Update: {
          active_ingredient?: string | null
          category?: string
          created_at?: string
          exercise_interactions?: string[] | null
          fitness_considerations?: string | null
          id?: string
          name?: string
          nutrition_interactions?: string[] | null
          risk_level?: string
          updated_at?: string
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
      menopause_profiles: {
        Row: {
          created_at: string
          guidance_plan: Json
          id: string
          last_assessment_date: string | null
          profile_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          guidance_plan?: Json
          id?: string
          last_assessment_date?: string | null
          profile_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          guidance_plan?: Json
          id?: string
          last_assessment_date?: string | null
          profile_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_challenges: {
        Row: {
          challenge: string
          challenge_type: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          month: number
          progress: number | null
          target: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          challenge: string
          challenge_type?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          month: number
          progress?: number | null
          target?: number | null
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          challenge?: string
          challenge_type?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          month?: number
          progress?: number | null
          target?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          avg_calories_per_day: number | null
          avg_carbs_per_day: number | null
          avg_fats_per_day: number | null
          avg_protein_per_day: number | null
          compliance_metrics: Json | null
          created_at: string
          hydration_avg_ml: number | null
          hydration_avg_score: number | null
          hydration_total_ml: number | null
          id: string
          inputs_avg_per_day: number | null
          inputs_count: number | null
          macro_distribution_month: Json | null
          month: number
          rest_days: number | null
          sleep_avg_score: number | null
          steps_avg: number | null
          steps_total: number | null
          summary_md: string | null
          summary_struct_json: Json | null
          supplements_count: number | null
          top_foods_month: Json | null
          total_calories: number | null
          total_carbs: number | null
          total_fats: number | null
          total_protein: number | null
          updated_at: string
          user_id: string
          workout_volume_avg: number | null
          workout_volume_total: number | null
          workouts_count: number | null
          year: number
        }
        Insert: {
          avg_calories_per_day?: number | null
          avg_carbs_per_day?: number | null
          avg_fats_per_day?: number | null
          avg_protein_per_day?: number | null
          compliance_metrics?: Json | null
          created_at?: string
          hydration_avg_ml?: number | null
          hydration_avg_score?: number | null
          hydration_total_ml?: number | null
          id?: string
          inputs_avg_per_day?: number | null
          inputs_count?: number | null
          macro_distribution_month?: Json | null
          month: number
          rest_days?: number | null
          sleep_avg_score?: number | null
          steps_avg?: number | null
          steps_total?: number | null
          summary_md?: string | null
          summary_struct_json?: Json | null
          supplements_count?: number | null
          top_foods_month?: Json | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id: string
          workout_volume_avg?: number | null
          workout_volume_total?: number | null
          workouts_count?: number | null
          year: number
        }
        Update: {
          avg_calories_per_day?: number | null
          avg_carbs_per_day?: number | null
          avg_fats_per_day?: number | null
          avg_protein_per_day?: number | null
          compliance_metrics?: Json | null
          created_at?: string
          hydration_avg_ml?: number | null
          hydration_avg_score?: number | null
          hydration_total_ml?: number | null
          id?: string
          inputs_avg_per_day?: number | null
          inputs_count?: number | null
          macro_distribution_month?: Json | null
          month?: number
          rest_days?: number | null
          sleep_avg_score?: number | null
          steps_avg?: number | null
          steps_total?: number | null
          summary_md?: string | null
          summary_struct_json?: Json | null
          supplements_count?: number | null
          top_foods_month?: Json | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id?: string
          workout_volume_avg?: number | null
          workout_volume_total?: number | null
          workouts_count?: number | null
          year?: number
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
      onboarding_stats: {
        Row: {
          created_at: string
          current_coupons_used: number
          id: string
          max_coupons: number
          total_users: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_coupons_used?: number
          id?: string
          max_coupons?: number
          total_users?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_coupons_used?: number
          id?: string
          max_coupons?: number
          total_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      orchestrator_traces: {
        Row: {
          coach_id: string | null
          error_message: string | null
          handler_name: string | null
          id: number
          latency_ms: number | null
          payload_json: Json | null
          stage: string
          status: string
          timestamp: string
          trace_id: string
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          error_message?: string | null
          handler_name?: string | null
          id?: number
          latency_ms?: number | null
          payload_json?: Json | null
          stage: string
          status: string
          timestamp?: string
          trace_id: string
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          error_message?: string | null
          handler_name?: string | null
          id?: number
          latency_ms?: number | null
          payload_json?: Json | null
          stage?: string
          status?: string
          timestamp?: string
          trace_id?: string
          user_id?: string | null
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
          client_event_id: string | null
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
          client_event_id?: string | null
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
          client_event_id?: string | null
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
      profile_reminder_log: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          days_since_update: number
          delivered_at: string | null
          delivery_method: string
          id: string
          message: string
          reminder_type: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          days_since_update: number
          delivered_at?: string | null
          delivery_method?: string
          id?: string
          message: string
          reminder_type?: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          days_since_update?: number
          delivered_at?: string | null
          delivery_method?: string
          id?: string
          message?: string
          reminder_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_preset_id: string | null
          avatar_type: string | null
          coach_personality: string | null
          created_at: string
          current_bmi: number | null
          current_period_end: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          goal: string | null
          goal_type: string | null
          height: number | null
          hide_premium_features: boolean | null
          id: string
          last_name: string | null
          macro_strategy: string | null
          medical_risk_level: string | null
          medical_screening_completed: boolean | null
          muscle_maintenance_priority: boolean | null
          preferred_language: string | null
          preferred_name: string | null
          preferred_theme: string | null
          profile_avatar_url: string | null
          start_bmi: number | null
          start_weight: number | null
          subscription_id: string | null
          subscription_status: string | null
          target_bmi: number | null
          target_body_fat_percentage: number | null
          target_date: string | null
          target_weight: number | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_preset_id?: string | null
          avatar_type?: string | null
          coach_personality?: string | null
          created_at?: string
          current_bmi?: number | null
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          goal?: string | null
          goal_type?: string | null
          height?: number | null
          hide_premium_features?: boolean | null
          id?: string
          last_name?: string | null
          macro_strategy?: string | null
          medical_risk_level?: string | null
          medical_screening_completed?: boolean | null
          muscle_maintenance_priority?: boolean | null
          preferred_language?: string | null
          preferred_name?: string | null
          preferred_theme?: string | null
          profile_avatar_url?: string | null
          start_bmi?: number | null
          start_weight?: number | null
          subscription_id?: string | null
          subscription_status?: string | null
          target_bmi?: number | null
          target_body_fat_percentage?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_preset_id?: string | null
          avatar_type?: string | null
          coach_personality?: string | null
          created_at?: string
          current_bmi?: number | null
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          goal?: string | null
          goal_type?: string | null
          height?: number | null
          hide_premium_features?: boolean | null
          id?: string
          last_name?: string | null
          macro_strategy?: string | null
          medical_risk_level?: string | null
          medical_screening_completed?: boolean | null
          muscle_maintenance_priority?: boolean | null
          preferred_language?: string | null
          preferred_name?: string | null
          preferred_theme?: string | null
          profile_avatar_url?: string | null
          start_bmi?: number | null
          start_weight?: number | null
          subscription_id?: string | null
          subscription_status?: string | null
          target_bmi?: number | null
          target_body_fat_percentage?: number | null
          target_date?: string | null
          target_weight?: number | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      progressive_prompts: {
        Row: {
          category: string
          context_tags: string[] | null
          created_at: string
          follow_up_text: string | null
          id: string
          prompt_level: number
          question_text: string
          usage_frequency: number | null
        }
        Insert: {
          category: string
          context_tags?: string[] | null
          created_at?: string
          follow_up_text?: string | null
          id?: string
          prompt_level: number
          question_text: string
          usage_frequency?: number | null
        }
        Update: {
          category?: string
          context_tags?: string[] | null
          created_at?: string
          follow_up_text?: string | null
          id?: string
          prompt_level?: number
          question_text?: string
          usage_frequency?: number | null
        }
        Relationships: []
      }
      quick_workouts: {
        Row: {
          created_at: string | null
          date: string | null
          description: string | null
          distance_km: number | null
          id: string
          steps: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          description?: string | null
          distance_km?: number | null
          id?: string
          steps?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          description?: string | null
          distance_km?: number | null
          id?: string
          steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      rag_chunk_logs: {
        Row: {
          chunk_id: string | null
          content_snippet: string | null
          conversation_id: string
          created_at: string
          id: string
          score: number | null
          source_doc: string | null
        }
        Insert: {
          chunk_id?: string | null
          content_snippet?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          score?: number | null
          source_doc?: string | null
        }
        Update: {
          chunk_id?: string | null
          content_snippet?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          score?: number | null
          source_doc?: string | null
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
          created_at: string | null
          hit_count: number | null
          id: string
          last_used_at: string | null
          query_embedding: string
          query_text: string
        }
        Insert: {
          created_at?: string | null
          hit_count?: number | null
          id?: string
          last_used_at?: string | null
          query_embedding: string
          query_text: string
        }
        Update: {
          created_at?: string | null
          hit_count?: number | null
          id?: string
          last_used_at?: string | null
          query_embedding?: string
          query_text?: string
        }
        Relationships: []
      }
      shadow_state: {
        Row: {
          created_at: string
          expires_at: string
          meta: Json
          trace_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          meta?: Json
          trace_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          meta?: Json
          trace_id?: string
          user_id?: string
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
          sleep_score: number | null
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
          sleep_score?: number | null
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
          sleep_score?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      strength_goals: {
        Row: {
          created_at: string
          current_1rm_kg: number | null
          estimated_weeks: number | null
          exercise_name: string
          id: string
          is_active: boolean
          notes: string | null
          target_1rm_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_1rm_kg?: number | null
          estimated_weeks?: number | null
          exercise_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          target_1rm_kg: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_1rm_kg?: number | null
          estimated_weeks?: number | null
          exercise_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          target_1rm_kg?: number
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
      supplement_analyses: {
        Row: {
          analysis_text: string
          created_at: string
          id: string
          supplement_combination_hash: string
          user_id: string
        }
        Insert: {
          analysis_text: string
          created_at?: string
          id?: string
          supplement_combination_hash: string
          user_id: string
        }
        Update: {
          analysis_text?: string
          created_at?: string
          id?: string
          supplement_combination_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      supplement_database: {
        Row: {
          category: string
          common_brands: string[] | null
          common_timing: string[] | null
          created_at: string
          default_dosage: string | null
          default_unit: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          recognition_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          common_brands?: string[] | null
          common_timing?: string[] | null
          created_at?: string
          default_dosage?: string | null
          default_unit?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          recognition_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          common_brands?: string[] | null
          common_timing?: string[] | null
          created_at?: string
          default_dosage?: string | null
          default_unit?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          recognition_keywords?: string[] | null
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
      supplement_recognition_log: {
        Row: {
          analysis_result: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          image_url: string
          recognized_supplements: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_result?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_url: string
          recognized_supplements?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_result?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_url?: string
          recognized_supplements?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      target_images: {
        Row: {
          ai_generated_from_photo_id: string | null
          created_at: string
          generation_prompt: string | null
          id: string
          image_category: string | null
          image_type: string
          image_url: string
          is_active: boolean
          is_cropped: boolean | null
          original_ai_url: string | null
          progress_photo_mapping: Json | null
          supabase_storage_path: string | null
          target_body_fat_percentage: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated_from_photo_id?: string | null
          created_at?: string
          generation_prompt?: string | null
          id?: string
          image_category?: string | null
          image_type: string
          image_url: string
          is_active?: boolean
          is_cropped?: boolean | null
          original_ai_url?: string | null
          progress_photo_mapping?: Json | null
          supabase_storage_path?: string | null
          target_body_fat_percentage?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated_from_photo_id?: string | null
          created_at?: string
          generation_prompt?: string | null
          id?: string
          image_category?: string | null
          image_type?: string
          image_url?: string
          is_active?: boolean
          is_cropped?: boolean | null
          original_ai_url?: string | null
          progress_photo_mapping?: Json | null
          supabase_storage_path?: string | null
          target_body_fat_percentage?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_target_images_progress_photo"
            columns: ["ai_generated_from_photo_id"]
            isOneToOne: false
            referencedRelation: "weight_history"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lexicon: {
        Row: {
          created_at: string | null
          hits: number | null
          id: string
          phrase: string
          source: string | null
          tool_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hits?: number | null
          id?: string
          phrase: string
          source?: string | null
          tool_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hits?: number | null
          id?: string
          phrase?: string
          source?: string | null
          tool_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_usage_events: {
        Row: {
          confidence: number | null
          conversation_id: string
          created_at: string
          id: string
          is_applied: boolean | null
          metadata: Json | null
          source: string
          tool: string
        }
        Insert: {
          confidence?: number | null
          conversation_id: string
          created_at?: string
          id?: string
          is_applied?: boolean | null
          metadata?: Json | null
          source?: string
          tool: string
        }
        Update: {
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_applied?: boolean | null
          metadata?: Json | null
          source?: string
          tool?: string
        }
        Relationships: []
      }
      training_exercise_templates: {
        Row: {
          biomechanics: Json | null
          category: string
          created_at: string
          difficulty_level: string | null
          equipment: string[] | null
          frequency_guidelines: Json | null
          gender_modifications: Json | null
          id: string
          load_progression: Json | null
          name: string
          primary_muscles: string[]
          research_citations: string[] | null
          secondary_muscles: string[] | null
          updated_at: string
          volume_guidelines: Json | null
        }
        Insert: {
          biomechanics?: Json | null
          category: string
          created_at?: string
          difficulty_level?: string | null
          equipment?: string[] | null
          frequency_guidelines?: Json | null
          gender_modifications?: Json | null
          id?: string
          load_progression?: Json | null
          name: string
          primary_muscles: string[]
          research_citations?: string[] | null
          secondary_muscles?: string[] | null
          updated_at?: string
          volume_guidelines?: Json | null
        }
        Update: {
          biomechanics?: Json | null
          category?: string
          created_at?: string
          difficulty_level?: string | null
          equipment?: string[] | null
          frequency_guidelines?: Json | null
          gender_modifications?: Json | null
          id?: string
          load_progression?: Json | null
          name?: string
          primary_muscles?: string[]
          research_citations?: string[] | null
          secondary_muscles?: string[] | null
          updated_at?: string
          volume_guidelines?: Json | null
        }
        Relationships: []
      }
      training_exercises: {
        Row: {
          created_at: string
          equipment: string[] | null
          exercise_name: string
          exercise_type: string | null
          id: string
          is_superset: boolean | null
          muscle_groups: string[] | null
          notes: string | null
          plan_day_id: string
          position: number
          progression_type: string | null
          superset_group: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment?: string[] | null
          exercise_name: string
          exercise_type?: string | null
          id?: string
          is_superset?: boolean | null
          muscle_groups?: string[] | null
          notes?: string | null
          plan_day_id: string
          position?: number
          progression_type?: string | null
          superset_group?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment?: string[] | null
          exercise_name?: string
          exercise_type?: string | null
          id?: string
          is_superset?: boolean | null
          muscle_groups?: string[] | null
          notes?: string | null
          plan_day_id?: string
          position?: number
          progression_type?: string | null
          superset_group?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_exercises_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "training_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_analytics: {
        Row: {
          coach_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          response_time_ms: number | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      training_plan_days: {
        Row: {
          created_at: string
          day_id: string
          day_name: string
          focus: string | null
          id: string
          is_rest_day: boolean | null
          plan_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          day_name: string
          focus?: string | null
          id?: string
          is_rest_day?: boolean | null
          plan_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          day_name?: string
          focus?: string | null
          id?: string
          is_rest_day?: boolean | null
          plan_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_warmup: boolean | null
          progression_rule: Json | null
          rest_seconds: number | null
          set_number: number
          target_load_kg: number | null
          target_pct_1rm: number | null
          target_reps: number | null
          target_reps_range: string | null
          target_rir: number | null
          target_rpe: number | null
          tempo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          is_warmup?: boolean | null
          progression_rule?: Json | null
          rest_seconds?: number | null
          set_number: number
          target_load_kg?: number | null
          target_pct_1rm?: number | null
          target_reps?: number | null
          target_reps_range?: string | null
          target_rir?: number | null
          target_rpe?: number | null
          tempo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_warmup?: boolean | null
          progression_rule?: Json | null
          rest_seconds?: number | null
          set_number?: number
          target_load_kg?: number | null
          target_pct_1rm?: number | null
          target_reps?: number | null
          target_reps_range?: string | null
          target_rir?: number | null
          target_rpe?: number | null
          tempo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "training_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      unmet_tool_events: {
        Row: {
          client_event_id: string | null
          confidence: number | null
          created_at: string | null
          error: string | null
          handled_manually: boolean | null
          id: string
          intent_guess: string | null
          manual_summary: string | null
          message: string
          session_id: string
          source: string | null
          status: string | null
          suggested_tool: string | null
          trace_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_event_id?: string | null
          confidence?: number | null
          created_at?: string | null
          error?: string | null
          handled_manually?: boolean | null
          id?: string
          intent_guess?: string | null
          manual_summary?: string | null
          message: string
          session_id: string
          source?: string | null
          status?: string | null
          suggested_tool?: string | null
          trace_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_event_id?: string | null
          confidence?: number | null
          created_at?: string | null
          error?: string | null
          handled_manually?: boolean | null
          id?: string
          intent_guess?: string | null
          manual_summary?: string | null
          message?: string
          session_id?: string
          source?: string | null
          status?: string | null
          suggested_tool?: string | null
          trace_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_credits: {
        Row: {
          created_at: string | null
          credits_remaining: number | null
          credits_total: number | null
          id: string
          last_reset_date: string | null
          last_reset_month: string
          monthly_quota: number
          tester: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_remaining?: number | null
          credits_total?: number | null
          id?: string
          last_reset_date?: string | null
          last_reset_month?: string
          monthly_quota?: number
          tester?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_remaining?: number | null
          credits_total?: number | null
          id?: string
          last_reset_date?: string | null
          last_reset_month?: string
          monthly_quota?: number
          tester?: boolean
          updated_at?: string | null
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
      user_feature_flags: {
        Row: {
          assigned_at: string
          feature_flag_id: string | null
          id: string
          is_enabled: boolean
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string
          feature_flag_id?: string | null
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string
          feature_flag_id?: string | null
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_flags_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
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
      user_medical_profile: {
        Row: {
          created_at: string
          custom_conditions: string[] | null
          custom_medications: string[] | null
          has_medical_conditions: boolean
          id: string
          medical_conditions: string[] | null
          medical_notes: string | null
          medications: string[] | null
          risk_assessment: Json | null
          screening_completed_at: string | null
          takes_medications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_conditions?: string[] | null
          custom_medications?: string[] | null
          has_medical_conditions?: boolean
          id?: string
          medical_conditions?: string[] | null
          medical_notes?: string | null
          medications?: string[] | null
          risk_assessment?: Json | null
          screening_completed_at?: string | null
          takes_medications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_conditions?: string[] | null
          custom_medications?: string[] | null
          has_medical_conditions?: boolean
          id?: string
          medical_conditions?: string[] | null
          medical_notes?: string | null
          medications?: string[] | null
          risk_assessment?: Json | null
          screening_completed_at?: string | null
          takes_medications?: boolean
          updated_at?: string
          user_id?: string
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
      user_profile_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          profile_delta: Json
          ts: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: number
          profile_delta: Json
          ts?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          profile_delta?: Json
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          profile: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
          canonical: string | null
          client_event_id: string | null
          confidence: number | null
          created_at: string
          custom_name: string | null
          dosage: string
          dose: string | null
          frequency_days: number | null
          goal: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string | null
          notes: string | null
          rating: number | null
          schedule: Json | null
          source: string | null
          supplement_id: string | null
          timing: string[]
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canonical?: string | null
          client_event_id?: string | null
          confidence?: number | null
          created_at?: string
          custom_name?: string | null
          dosage: string
          dose?: string | null
          frequency_days?: number | null
          goal?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          notes?: string | null
          rating?: number | null
          schedule?: Json | null
          source?: string | null
          supplement_id?: string | null
          timing?: string[]
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canonical?: string | null
          client_event_id?: string | null
          confidence?: number | null
          created_at?: string
          custom_name?: string | null
          dosage?: string
          dose?: string | null
          frequency_days?: number | null
          goal?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          notes?: string | null
          rating?: number | null
          schedule?: Json | null
          source?: string | null
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
      user_tracking_preferences: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_enabled: boolean
          tracking_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          tracking_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          tracking_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_training_history: {
        Row: {
          created_at: string
          date: string
          estimated_1rm: number | null
          exercise_name: string
          id: string
          load_kg: number | null
          reps_performed: number | null
          rir_actual: number | null
          rpe_actual: number | null
          session_id: string | null
          sets_performed: number | null
          user_id: string
          volume_load: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          estimated_1rm?: number | null
          exercise_name: string
          id?: string
          load_kg?: number | null
          reps_performed?: number | null
          rir_actual?: number | null
          rpe_actual?: number | null
          session_id?: string | null
          sets_performed?: number | null
          user_id: string
          volume_load?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          estimated_1rm?: number | null
          exercise_name?: string
          id?: string
          load_kg?: number | null
          reps_performed?: number | null
          rir_actual?: number | null
          rpe_actual?: number | null
          session_id?: string | null
          sets_performed?: number | null
          user_id?: string
          volume_load?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_training_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exercise_sessions"
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
      weekly_summaries: {
        Row: {
          avg_calories_per_day: number | null
          avg_carbs_per_day: number | null
          avg_fats_per_day: number | null
          avg_protein_per_day: number | null
          compliance_metrics: Json | null
          created_at: string
          hydration_avg_ml: number | null
          hydration_avg_score: number | null
          hydration_total_ml: number | null
          id: string
          inputs_avg_per_day: number | null
          inputs_count: number | null
          iso_week: number
          iso_year: number
          rest_days: number | null
          sleep_avg_score: number | null
          steps_avg: number | null
          steps_total: number | null
          summary_struct_json: Json | null
          supplements_count: number | null
          total_calories: number | null
          total_carbs: number | null
          total_fats: number | null
          total_protein: number | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
          workout_volume_avg: number | null
          workout_volume_total: number | null
          workouts_count: number | null
        }
        Insert: {
          avg_calories_per_day?: number | null
          avg_carbs_per_day?: number | null
          avg_fats_per_day?: number | null
          avg_protein_per_day?: number | null
          compliance_metrics?: Json | null
          created_at?: string
          hydration_avg_ml?: number | null
          hydration_avg_score?: number | null
          hydration_total_ml?: number | null
          id?: string
          inputs_avg_per_day?: number | null
          inputs_count?: number | null
          iso_week: number
          iso_year: number
          rest_days?: number | null
          sleep_avg_score?: number | null
          steps_avg?: number | null
          steps_total?: number | null
          summary_struct_json?: Json | null
          supplements_count?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
          workout_volume_avg?: number | null
          workout_volume_total?: number | null
          workouts_count?: number | null
        }
        Update: {
          avg_calories_per_day?: number | null
          avg_carbs_per_day?: number | null
          avg_fats_per_day?: number | null
          avg_protein_per_day?: number | null
          compliance_metrics?: Json | null
          created_at?: string
          hydration_avg_ml?: number | null
          hydration_avg_score?: number | null
          hydration_total_ml?: number | null
          id?: string
          inputs_avg_per_day?: number | null
          inputs_count?: number | null
          iso_week?: number
          iso_year?: number
          rest_days?: number | null
          sleep_avg_score?: number | null
          steps_avg?: number | null
          steps_total?: number | null
          summary_struct_json?: Json | null
          supplements_count?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
          workout_volume_avg?: number | null
          workout_volume_total?: number | null
          workouts_count?: number | null
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          body_fat_percentage: number | null
          body_water_percentage: number | null
          client_event_id: string | null
          created_at: string
          date: string
          id: string
          image_category: string | null
          muscle_percentage: number | null
          notes: string | null
          photo_metadata: Json | null
          photo_urls: Json | null
          updated_at: string
          user_id: string
          visceral_fat: number | null
          weight: number
        }
        Insert: {
          body_fat_percentage?: number | null
          body_water_percentage?: number | null
          client_event_id?: string | null
          created_at?: string
          date?: string
          id?: string
          image_category?: string | null
          muscle_percentage?: number | null
          notes?: string | null
          photo_metadata?: Json | null
          photo_urls?: Json | null
          updated_at?: string
          user_id: string
          visceral_fat?: number | null
          weight: number
        }
        Update: {
          body_fat_percentage?: number | null
          body_water_percentage?: number | null
          client_event_id?: string | null
          created_at?: string
          date?: string
          id?: string
          image_category?: string | null
          muscle_percentage?: number | null
          notes?: string | null
          photo_metadata?: Json | null
          photo_urls?: Json | null
          updated_at?: string
          user_id?: string
          visceral_fat?: number | null
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
      workout_plan_drafts: {
        Row: {
          created_at: string | null
          days_per_wk: number | null
          goal: string | null
          id: string
          name: string | null
          notes: string | null
          structure_json: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          days_per_wk?: number | null
          goal?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          structure_json?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          days_per_wk?: number | null
          goal?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          structure_json?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workout_plan_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty_level: number | null
          estimated_duration_minutes: number | null
          exercises: Json
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          accepted_at: string | null
          category: string
          coach_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_weeks: number | null
          estimated_duration_minutes: number | null
          exercises: Json
          id: string
          is_public: boolean
          name: string
          plan_type: string | null
          progression_scheme: Json | null
          scientific_basis: Json | null
          status: string | null
          target_frequency: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          category: string
          coach_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_public?: boolean
          name: string
          plan_type?: string | null
          progression_scheme?: Json | null
          scientific_basis?: Json | null
          status?: string | null
          target_frequency?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          category?: string
          coach_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          is_public?: boolean
          name?: string
          plan_type?: string | null
          progression_scheme?: Json | null
          scientific_basis?: Json | null
          status?: string | null
          target_frequency?: number | null
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
      v_coach_dashboard: {
        Row: {
          admin_status: string | null
          coach: string | null
          coach_msgs: number | null
          conversation_id: string | null
          last_msg_at: string | null
          plan_count: number | null
          started_at: string | null
          tool_list: string[] | null
          used_rag: boolean | null
          used_tool: boolean | null
          user_id: string | null
          user_msgs: number | null
        }
        Relationships: []
      }
      v_fluids_totals: {
        Row: {
          date: string | null
          fluids_ml: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_meal_totals: {
        Row: {
          carbs: number | null
          d: string | null
          fats: number | null
          kcal: number | null
          meals: Json | null
          protein: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_missing_summaries: {
        Row: {
          email: string | null
          status: string | null
          summary_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_momentum_meals_compat: {
        Row: {
          carbs: number | null
          fat: number | null
          id: string | null
          image_url: string | null
          kcal: number | null
          protein: number | null
          quality_score: number | null
          title: string | null
          ts: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_orchestrator_metrics_60m: {
        Row: {
          avg_latency_ms: number | null
          error_rate: number | null
          stage: string | null
        }
        Relationships: []
      }
      v_orchestrator_traces_open_errors: {
        Row: {
          coach_id: string | null
          error_message: string | null
          handler_name: string | null
          id: number | null
          latency_ms: number | null
          payload_json: Json | null
          stage: string | null
          status: string | null
          timestamp: string | null
          trace_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_orchestrator_traces_recent: {
        Row: {
          coach_id: string | null
          error_message: string | null
          handler_name: string | null
          id: number | null
          latency_ms: number | null
          payload_json: Json | null
          stage: string | null
          status: string | null
          timestamp: string | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          coach_id?: string | null
          error_message?: string | null
          handler_name?: string | null
          id?: number | null
          latency_ms?: number | null
          payload_json?: Json | null
          stage?: string | null
          status?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          coach_id?: string | null
          error_message?: string | null
          handler_name?: string | null
          id?: number | null
          latency_ms?: number | null
          payload_json?: Json | null
          stage?: string | null
          status?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_recent_unmet: {
        Row: {
          confidence: number | null
          created_at: string | null
          intent_guess: string | null
          msg_snippet: string | null
          source: string | null
          suggested_tool: string | null
          trace_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_summary_rolling_30: {
        Row: {
          completeness_score: number | null
          date: string | null
          hydration_ml: number | null
          hydration_score: number | null
          kcal: number | null
          mood: string | null
          sleep_hours: number | null
          sleep_score: number | null
          supplement_compliance: number | null
          user_id: string | null
          volume_kg: number | null
        }
        Relationships: []
      }
      v_supplement_flags: {
        Row: {
          compliance_pct: number | null
          date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_today_fluids: {
        Row: {
          date_key: string | null
          today_ml: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_today_meals: {
        Row: {
          carbs: number | null
          fat: number | null
          id: string | null
          image_url: string | null
          kcal: number | null
          protein: number | null
          quality_score: number | null
          title: string | null
          ts: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_today_meals_union: {
        Row: {
          carbs: number | null
          fat: number | null
          id: string | null
          kcal: number | null
          protein: number | null
          quality_score: number | null
          title: string | null
          ts: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_trace_kpis_24h: {
        Row: {
          avg_latency_ms: number | null
          calls: number | null
          error_rate: number | null
          errors: number | null
          handler_name: string | null
          p90_latency_ms: number | null
        }
        Relationships: []
      }
      v_unmet_tool_stats: {
        Row: {
          avg_confidence: number | null
          day: string | null
          intent_guess: string | null
          unmet_count: number | null
        }
        Relationships: []
      }
      v_user_strength_profile: {
        Row: {
          avg_weight: number | null
          exercise_category: string | null
          exercise_name: string | null
          max_weight: number | null
          strength_level: string | null
          total_sets: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_vita_knowledge_analytics: {
        Row: {
          content_length: number | null
          covers_endometriosis: boolean | null
          covers_menopause: boolean | null
          covers_menstrual_health: boolean | null
          covers_pcos: boolean | null
          covers_pregnancy: boolean | null
          created_at: string | null
          evidence_level: string | null
          expertise_area: string | null
          has_embeddings: boolean | null
          id: string | null
          search_hits_last_30_days: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content_length?: never
          covers_endometriosis?: never
          covers_menopause?: never
          covers_menstrual_health?: never
          covers_pcos?: never
          covers_pregnancy?: never
          created_at?: string | null
          evidence_level?: never
          expertise_area?: string | null
          has_embeddings?: never
          id?: string | null
          search_hits_last_30_days?: never
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content_length?: never
          covers_endometriosis?: never
          covers_menopause?: never
          covers_menstrual_health?: never
          covers_pcos?: never
          covers_pregnancy?: never
          created_at?: string | null
          evidence_level?: never
          expertise_area?: string | null
          has_embeddings?: never
          id?: string | null
          search_hits_last_30_days?: never
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_workout_totals: {
        Row: {
          d: string | null
          user_id: string | null
          volume_kg: number | null
          workouts: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      _ensure_user_credits: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          credits_remaining: number | null
          credits_total: number | null
          id: string
          last_reset_date: string | null
          last_reset_month: string
          monthly_quota: number
          tester: boolean
          updated_at: string | null
          user_id: string
        }
      }
      add_credits: {
        Args: { p_user_id: string; p_credits: number }
        Returns: Json
      }
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
      backfill_daily_summaries_v2: {
        Args: { p_user_id: string; p_days?: number }
        Returns: {
          date_processed: string
          request_id: number
          status: string
        }[]
      }
      calculate_sleep_score: {
        Args: { sleep_hours: number; sleep_quality: number }
        Returns: number
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
      cleanup_old_client_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_stale_client_events: {
        Args: { max_age?: unknown }
        Returns: number
      }
      compute_monthly_summary: {
        Args: {
          p_user_id: string
          p_year: number
          p_month: number
          p_force?: boolean
        }
        Returns: Json
      }
      compute_weekly_summary: {
        Args: { p_user_id: string; p_week_start: string }
        Returns: Json
      }
      consume_credits_for_feature: {
        Args: { p_feature_type: string; p_deduct?: boolean }
        Returns: Json
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      days_in_month: {
        Args: { p_year: number; p_month: number }
        Returns: number
      }
      deduct_credits: {
        Args: { p_user_id: string; p_credits: number }
        Returns: Json
      }
      detect_suspicious_activity: {
        Args: { p_identifier: string; p_time_window_minutes?: number }
        Returns: Json
      }
      fast_fluid_totals: {
        Args: { p_user: string; p_d: string }
        Returns: number
      }
      fast_meal_totals: {
        Args: { p_user: string; p_d: string }
        Returns: {
          calories: number
          protein: number
          carbs: number
          fats: number
        }[]
      }
      fast_sets_volume: {
        Args: { p_user: string; p_d: string }
        Returns: number
      }
      get_coach_analytics_7d: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_credits_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_day_context: {
        Args: { p_user: string; p_day: string }
        Returns: Json
      }
      get_next_entry_sequence: {
        Args: { p_user_id: string; p_date: string }
        Returns: number
      }
      get_or_cache_query_embedding: {
        Args: { query_text: string; query_embedding: string }
        Returns: string
      }
      get_summary_range_v2: {
        Args: { p_user_id: string; p_days?: number }
        Returns: {
          date: string
          kcal: number
          volume_kg: number
          sleep_hours: number
          sleep_score: number
          hydration_ml: number
          hydration_score: number
          supplement_compliance: number
          mood: string
          completeness_score: number
        }[]
      }
      has_admin_access: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      increment_onboarding_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin_by_email: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: { user_uuid?: string }
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
      is_super_admin_user: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      log_admin_access_attempt: {
        Args: {
          p_user_id: string
          p_access_granted: boolean
          p_requested_resource: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: undefined
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
      log_trace_event: {
        Args: { p_trace_id: string; p_stage: string; p_data?: Json }
        Returns: undefined
      }
      perform_medical_risk_assessment: {
        Args: {
          p_user_id: string
          p_conditions: string[]
          p_custom_conditions: string[]
          p_medications: string[]
          p_custom_medications: string[]
        }
        Returns: Json
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
      search_vita_knowledge_hybrid: {
        Args: {
          query_text: string
          query_embedding: string
          user_context?: Json
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
          vita_specialization_score: number
        }[]
      }
      search_vita_knowledge_semantic: {
        Args: {
          query_embedding: string
          user_age?: number
          menopause_stage?: string
          cycle_phase?: string
          health_conditions?: string[]
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
          life_stage_boost: number
          evidence_quality_score: number
        }[]
      }
      update_user_points_and_level: {
        Args: {
          p_user_id: string
          p_points: number
          p_activity_type: string
          p_description?: string
          p_multiplier?: number
          p_trial_multiplier?: number
          p_client_event_id?: string
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
      validate_admin_access: {
        Args: { p_resource?: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "marketing"
        | "support"
        | "super_admin"
      client_event_status: "RECEIVED" | "FINAL" | "CANCELLED" | "STALE"
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
        "marketing",
        "support",
        "super_admin",
      ],
      client_event_status: ["RECEIVED", "FINAL", "CANCELLED", "STALE"],
    },
  },
} as const
