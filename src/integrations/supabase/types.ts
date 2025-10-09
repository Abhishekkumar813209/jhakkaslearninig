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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string | null
          achievement_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          score: number | null
          student_id: string
          subject: string | null
          test_id: string | null
        }
        Insert: {
          achieved_at?: string | null
          achievement_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          score?: number | null
          student_id: string
          subject?: string | null
          test_id?: string | null
        }
        Update: {
          achieved_at?: string | null
          achievement_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          score?: number | null
          student_id?: string
          subject?: string | null
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_roadmaps: {
        Row: {
          ai_generated_plan: Json | null
          batch_id: string | null
          board: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          exam_name: string | null
          exam_type: string | null
          id: string
          mode: string | null
          pdf_source_id: string | null
          selected_subjects: Json | null
          start_date: string
          status: Database["public"]["Enums"]["roadmap_status"] | null
          target_board: string | null
          target_class: string | null
          title: string
          total_days: number | null
          updated_at: string | null
        }
        Insert: {
          ai_generated_plan?: Json | null
          batch_id?: string | null
          board?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          exam_name?: string | null
          exam_type?: string | null
          id?: string
          mode?: string | null
          pdf_source_id?: string | null
          selected_subjects?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["roadmap_status"] | null
          target_board?: string | null
          target_class?: string | null
          title: string
          total_days?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_generated_plan?: Json | null
          batch_id?: string | null
          board?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          exam_name?: string | null
          exam_type?: string | null
          id?: string
          mode?: string | null
          pdf_source_id?: string | null
          selected_subjects?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["roadmap_status"] | null
          target_board?: string | null
          target_class?: string | null
          title?: string
          total_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_roadmaps_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_roadmaps_pdf_source_id_fkey"
            columns: ["pdf_source_id"]
            isOneToOne: false
            referencedRelation: "content_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          auto_assign_enabled: boolean | null
          auto_assign_roadmap: boolean | null
          created_at: string | null
          current_strength: number | null
          description: string | null
          end_date: string | null
          exam_name: string | null
          exam_type: string | null
          id: string
          instructor_id: string
          intake_end_date: string | null
          intake_start_date: string | null
          is_active: boolean | null
          is_current_intake: boolean | null
          level: string
          linked_roadmap_id: string | null
          max_capacity: number
          name: string
          start_date: string
          target_board: Database["public"]["Enums"]["education_board"] | null
          target_class: Database["public"]["Enums"]["student_class"] | null
          updated_at: string | null
        }
        Insert: {
          auto_assign_enabled?: boolean | null
          auto_assign_roadmap?: boolean | null
          created_at?: string | null
          current_strength?: number | null
          description?: string | null
          end_date?: string | null
          exam_name?: string | null
          exam_type?: string | null
          id?: string
          instructor_id: string
          intake_end_date?: string | null
          intake_start_date?: string | null
          is_active?: boolean | null
          is_current_intake?: boolean | null
          level: string
          linked_roadmap_id?: string | null
          max_capacity: number
          name: string
          start_date: string
          target_board?: Database["public"]["Enums"]["education_board"] | null
          target_class?: Database["public"]["Enums"]["student_class"] | null
          updated_at?: string | null
        }
        Update: {
          auto_assign_enabled?: boolean | null
          auto_assign_roadmap?: boolean | null
          created_at?: string | null
          current_strength?: number | null
          description?: string | null
          end_date?: string | null
          exam_name?: string | null
          exam_type?: string | null
          id?: string
          instructor_id?: string
          intake_end_date?: string | null
          intake_start_date?: string | null
          is_active?: boolean | null
          is_current_intake?: boolean | null
          level?: string
          linked_roadmap_id?: string | null
          max_capacity?: number
          name?: string
          start_date?: string
          target_board?: Database["public"]["Enums"]["education_board"] | null
          target_class?: Database["public"]["Enums"]["student_class"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_linked_roadmap_id_fkey"
            columns: ["linked_roadmap_id"]
            isOneToOne: false
            referencedRelation: "batch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_library: {
        Row: {
          can_skip: boolean | null
          chapter_name: string
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          exam_relevance: string | null
          exam_type: string
          id: string
          importance_score: number | null
          is_active: boolean | null
          is_custom: boolean | null
          subject: string
          suggested_days: number | null
          topics: Json | null
          topics_generated: boolean | null
          updated_at: string | null
        }
        Insert: {
          can_skip?: boolean | null
          chapter_name: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          exam_relevance?: string | null
          exam_type: string
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          is_custom?: boolean | null
          subject: string
          suggested_days?: number | null
          topics?: Json | null
          topics_generated?: boolean | null
          updated_at?: string | null
        }
        Update: {
          can_skip?: boolean | null
          chapter_name?: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          exam_relevance?: string | null
          exam_type?: string
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          is_custom?: boolean | null
          subject?: string
          suggested_days?: number | null
          topics?: Json | null
          topics_generated?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      content_approval_queue: {
        Row: {
          admin_feedback: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_feedback?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_feedback?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_approval_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approval_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approval_queue_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "content_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      content_modification_history: {
        Row: {
          content_id: string
          content_type: string
          id: string
          modification_prompt: string | null
          modified_at: string | null
          modified_by: string
          modified_content: string
          original_content: string
        }
        Insert: {
          content_id: string
          content_type: string
          id?: string
          modification_prompt?: string | null
          modified_at?: string | null
          modified_by: string
          modified_content: string
          original_content: string
        }
        Update: {
          content_id?: string
          content_type?: string
          id?: string
          modification_prompt?: string | null
          modified_at?: string | null
          modified_by?: string
          modified_content?: string
          original_content?: string
        }
        Relationships: []
      }
      content_sources: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          source_type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          source_type: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          source_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_sources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_sources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string
          duration_hours: number | null
          enrollment_count: number | null
          id: string
          instructor_id: string
          is_paid: boolean | null
          is_published: boolean | null
          level: Database["public"]["Enums"]["course_level"]
          price: number | null
          rating: number | null
          subject: string
          tags: string[] | null
          thumbnail: string | null
          title: string
          total_videos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          duration_hours?: number | null
          enrollment_count?: number | null
          id?: string
          instructor_id: string
          is_paid?: boolean | null
          is_published?: boolean | null
          level: Database["public"]["Enums"]["course_level"]
          price?: number | null
          rating?: number | null
          subject: string
          tags?: string[] | null
          thumbnail?: string | null
          title: string
          total_videos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          duration_hours?: number | null
          enrollment_count?: number | null
          id?: string
          instructor_id?: string
          is_paid?: boolean | null
          is_published?: boolean | null
          level?: Database["public"]["Enums"]["course_level"]
          price?: number | null
          rating?: number | null
          subject?: string
          tags?: string[] | null
          thumbnail?: string | null
          title?: string
          total_videos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          coin_reward: number
          created_at: string | null
          description: string
          icon: string
          id: string
          is_active: boolean | null
          quest_type: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          coin_reward: number
          created_at?: string | null
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          quest_type: string
          target_value: number
          title: string
          xp_reward: number
        }
        Update: {
          coin_reward?: number
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          quest_type?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          enrolled_at: string | null
          id: string
          is_completed: boolean | null
          progress: number | null
          rating: number | null
          review: string | null
          student_id: string
          total_watch_time_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          rating?: number | null
          review?: string | null
          student_id: string
          total_watch_time_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          rating?: number | null
          review?: string | null
          student_id?: string
          total_watch_time_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_domains: {
        Row: {
          available_exams: Json | null
          category: string
          created_at: string | null
          description: string | null
          domain_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          available_exams?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          domain_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          available_exams?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          domain_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exam_templates: {
        Row: {
          created_at: string | null
          exam_name: string
          exam_type: string
          id: string
          is_active: boolean | null
          standard_subjects: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_name: string
          exam_type: string
          id?: string
          is_active?: boolean | null
          standard_subjects: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_name?: string
          exam_type?: string
          id?: string
          is_active?: boolean | null
          standard_subjects?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      exam_types: {
        Row: {
          available_exams: Json | null
          category: string
          code: string
          color_class: string | null
          created_at: string | null
          display_name: string
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          requires_board: boolean | null
          requires_class: boolean | null
          updated_at: string | null
        }
        Insert: {
          available_exams?: Json | null
          category: string
          code: string
          color_class?: string | null
          created_at?: string | null
          display_name: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          requires_board?: boolean | null
          requires_class?: boolean | null
          updated_at?: string | null
        }
        Update: {
          available_exams?: Json | null
          category?: string
          code?: string
          color_class?: string | null
          created_at?: string | null
          display_name?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          requires_board?: boolean | null
          requires_class?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fee_records: {
        Row: {
          amount: number
          batch_id: string | null
          battery_level: number
          created_at: string
          due_date: string
          id: string
          is_paid: boolean
          marked_by: string | null
          month: number
          paid_date: string | null
          payment_method: string | null
          student_id: string
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          battery_level?: number
          created_at?: string
          due_date: string
          id?: string
          is_paid?: boolean
          marked_by?: string | null
          month: number
          paid_date?: string | null
          payment_method?: string | null
          student_id: string
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          batch_id?: string | null
          battery_level?: number
          created_at?: string
          due_date?: string
          id?: string
          is_paid?: boolean
          marked_by?: string | null
          month?: number
          paid_date?: string | null
          payment_method?: string | null
          student_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_reminders: {
        Row: {
          email_status: string
          fee_record_id: string
          id: string
          parent_id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          email_status?: string
          fee_record_id: string
          id?: string
          parent_id: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          email_status?: string
          fee_record_id?: string
          id?: string
          parent_id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: []
      }
      gamified_exercises: {
        Row: {
          coin_reward: number | null
          correct_answer: Json | null
          created_at: string | null
          difficulty: string | null
          exercise_data: Json
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          explanation: string | null
          id: string
          topic_content_id: string
          xp_reward: number | null
        }
        Insert: {
          coin_reward?: number | null
          correct_answer?: Json | null
          created_at?: string | null
          difficulty?: string | null
          exercise_data: Json
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          explanation?: string | null
          id?: string
          topic_content_id: string
          xp_reward?: number | null
        }
        Update: {
          coin_reward?: number | null
          correct_answer?: Json | null
          created_at?: string | null
          difficulty?: string | null
          exercise_data?: Json
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          explanation?: string | null
          id?: string
          topic_content_id?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gamified_exercises_topic_content_id_fkey"
            columns: ["topic_content_id"]
            isOneToOne: false
            referencedRelation: "topic_content_mapping"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_questions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          chapter_name: string | null
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          is_approved: boolean | null
          marks: number | null
          options: Json | null
          question_text: string
          question_type: string
          source_id: string | null
          study_content_id: string | null
          subject: string | null
          topic_name: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          chapter_name?: string | null
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_approved?: boolean | null
          marks?: number | null
          options?: Json | null
          question_text: string
          question_type: string
          source_id?: string | null
          study_content_id?: string | null
          subject?: string | null
          topic_name?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          chapter_name?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_approved?: boolean | null
          marks?: number | null
          options?: Json | null
          question_text?: string
          question_type?: string
          source_id?: string | null
          study_content_id?: string | null
          subject?: string | null
          topic_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_questions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_questions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_questions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "content_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_questions_study_content_id_fkey"
            columns: ["study_content_id"]
            isOneToOne: false
            referencedRelation: "study_content"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_path_chapters: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          guided_path_id: string
          id: string
          order_num: number
          playlist_id: string | null
          title: string
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          guided_path_id: string
          id?: string
          order_num: number
          playlist_id?: string | null
          title: string
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          guided_path_id?: string
          id?: string
          order_num?: number
          playlist_id?: string | null
          title?: string
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guided_path_chapters_guided_path_id_fkey"
            columns: ["guided_path_id"]
            isOneToOne: false
            referencedRelation: "guided_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_path_resources: {
        Row: {
          chapter_id: string
          created_at: string | null
          description: string | null
          id: string
          order_num: number | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_num?: number | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_num?: number | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guided_path_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "guided_path_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_paths: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          duration_weeks: number
          exam_category: string | null
          id: string
          is_active: boolean | null
          level: string
          objectives: string[] | null
          subject: string
          target_students: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_weeks?: number
          exam_category?: string | null
          id?: string
          is_active?: boolean | null
          level: string
          objectives?: string[] | null
          subject: string
          target_students: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_weeks?: number
          exam_category?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          objectives?: string[] | null
          subject?: string
          target_students?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leaderboard_access_log: {
        Row: {
          access_granted: boolean
          accessed_at: string
          accessed_by: string
          id: string
          ip_address: string | null
          test_id: string
          user_agent: string | null
        }
        Insert: {
          access_granted: boolean
          accessed_at?: string
          accessed_by: string
          id?: string
          ip_address?: string | null
          test_id: string
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean
          accessed_at?: string
          accessed_by?: string
          id?: string
          ip_address?: string | null
          test_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      leaderboard_query_rate_limit: {
        Row: {
          id: string
          last_query_at: string
          query_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          id?: string
          last_query_at?: string
          query_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          id?: string
          last_query_at?: string
          query_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          max_xp: number | null
          min_xp: number
          name: string
          tier: number
        }
        Insert: {
          color: string
          created_at?: string | null
          icon: string
          id?: string
          max_xp?: number | null
          min_xp: number
          name: string
          tier: number
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          max_xp?: number | null
          min_xp?: number
          name?: string
          tier?: number
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_completion_date: string | null
          id: string
          is_custom: boolean | null
          progress: number | null
          student_id: string
          subject: string
          teacher_name: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_completion_date?: string | null
          id?: string
          is_custom?: boolean | null
          progress?: number | null
          student_id: string
          subject: string
          teacher_name: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_completion_date?: string | null
          id?: string
          is_custom?: boolean | null
          progress?: number | null
          student_id?: string
          subject?: string
          teacher_name?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lectures: {
        Row: {
          chapter: number
          course_id: string
          created_at: string | null
          description: string | null
          duration_seconds: number
          id: string
          is_published: boolean | null
          order_num: number
          playlist_id: string | null
          processing_status: string | null
          thumbnail: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          video_url: string
          watch_count: number | null
          youtube_video_id: string | null
        }
        Insert: {
          chapter: number
          course_id: string
          created_at?: string | null
          description?: string | null
          duration_seconds: number
          id?: string
          is_published?: boolean | null
          order_num: number
          playlist_id?: string | null
          processing_status?: string | null
          thumbnail?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          video_url: string
          watch_count?: number | null
          youtube_video_id?: string | null
        }
        Update: {
          chapter?: number
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          is_published?: boolean | null
          order_num?: number
          playlist_id?: string | null
          processing_status?: string | null
          thumbnail?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          video_url?: string
          watch_count?: number | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          created_at: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          is_correct: boolean
          option_text: string
          order_num: number
          question_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_correct?: boolean
          option_text: string
          order_num?: number
          question_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_correct?: boolean
          option_text?: string
          order_num?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          is_primary_contact: boolean
          parent_id: string
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean
          parent_id: string
          relationship?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean
          parent_id?: string
          relationship?: string
          student_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          student_id: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          student_id: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          student_id?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "test_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          chapter: string | null
          created_at: string | null
          id: string
          learning_path_id: string
          order_num: number | null
          thumbnail_url: string | null
          title: string
          total_duration_minutes: number | null
          updated_at: string | null
          video_count: number | null
          youtube_playlist_id: string
        }
        Insert: {
          chapter?: string | null
          created_at?: string | null
          id?: string
          learning_path_id: string
          order_num?: number | null
          thumbnail_url?: string | null
          title: string
          total_duration_minutes?: number | null
          updated_at?: string | null
          video_count?: number | null
          youtube_playlist_id: string
        }
        Update: {
          chapter?: string | null
          created_at?: string | null
          id?: string
          learning_path_id?: string
          order_num?: number | null
          thumbnail_url?: string | null
          title?: string
          total_duration_minutes?: number | null
          updated_at?: string | null
          video_count?: number | null
          youtube_playlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_audit_log: {
        Row: {
          action: string
          changed_fields: Json | null
          id: string
          ip_address: string | null
          performed_at: string
          performed_by: string
          profile_id: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by: string
          profile_id: string
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          id?: string
          ip_address?: string | null
          performed_at?: string
          performed_by?: string
          profile_id?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch_id: string | null
          created_at: string | null
          education_board: Database["public"]["Enums"]["education_board"] | null
          email: string | null
          exam_domain: string | null
          full_name: string | null
          id: string
          preparation_level: string | null
          school_id: string | null
          student_class: Database["public"]["Enums"]["student_class"] | null
          target_exam: string | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          batch_id?: string | null
          created_at?: string | null
          education_board?:
            | Database["public"]["Enums"]["education_board"]
            | null
          email?: string | null
          exam_domain?: string | null
          full_name?: string | null
          id: string
          preparation_level?: string | null
          school_id?: string | null
          student_class?: Database["public"]["Enums"]["student_class"] | null
          target_exam?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          batch_id?: string | null
          created_at?: string | null
          education_board?:
            | Database["public"]["Enums"]["education_board"]
            | null
          email?: string | null
          exam_domain?: string | null
          full_name?: string | null
          id?: string
          preparation_level?: string | null
          school_id?: string | null
          student_class?: Database["public"]["Enums"]["student_class"] | null
          target_exam?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          allow_multiple_correct: boolean | null
          correct_answer: string | null
          created_at: string | null
          explanation: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          marks: number
          options: Json | null
          order_num: number
          position: number | null
          qtype: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          sample_answer: string | null
          tags: string[] | null
          test_id: string
          word_limit: number | null
        }
        Insert: {
          allow_multiple_correct?: boolean | null
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          marks: number
          options?: Json | null
          order_num: number
          position?: number | null
          qtype?: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          sample_answer?: string | null
          tags?: string[] | null
          test_id: string
          word_limit?: number | null
        }
        Update: {
          allow_multiple_correct?: boolean | null
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          marks?: number
          options?: Json | null
          order_num?: number
          position?: number | null
          qtype?: string | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          sample_answer?: string | null
          tags?: string[] | null
          test_id?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_chapters: {
        Row: {
          chapter_library_id: string | null
          chapter_name: string
          created_at: string | null
          day_end: number | null
          day_start: number | null
          estimated_days: number | null
          id: string
          is_custom: boolean | null
          is_selected: boolean | null
          order_num: number
          roadmap_id: string
          selected_from_library: boolean | null
          subject: string
          xp_reward: number | null
        }
        Insert: {
          chapter_library_id?: string | null
          chapter_name: string
          created_at?: string | null
          day_end?: number | null
          day_start?: number | null
          estimated_days?: number | null
          id?: string
          is_custom?: boolean | null
          is_selected?: boolean | null
          order_num: number
          roadmap_id: string
          selected_from_library?: boolean | null
          subject: string
          xp_reward?: number | null
        }
        Update: {
          chapter_library_id?: string | null
          chapter_name?: string
          created_at?: string | null
          day_end?: number | null
          day_start?: number | null
          estimated_days?: number | null
          id?: string
          is_custom?: boolean | null
          is_selected?: boolean | null
          order_num?: number
          roadmap_id?: string
          selected_from_library?: boolean | null
          subject?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_chapters_chapter_library_id_fkey"
            columns: ["chapter_library_id"]
            isOneToOne: false
            referencedRelation: "chapter_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_chapters_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "batch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_topics: {
        Row: {
          chapter_id: string
          coin_reward: number | null
          created_at: string | null
          day_number: number
          estimated_hours: number
          id: string
          order_num: number
          topic_name: string
          unlock_condition: string | null
          xp_reward: number | null
        }
        Insert: {
          chapter_id: string
          coin_reward?: number | null
          created_at?: string | null
          day_number: number
          estimated_hours: number
          id?: string
          order_num: number
          topic_name: string
          unlock_condition?: string | null
          xp_reward?: number | null
        }
        Update: {
          chapter_id?: string
          coin_reward?: number | null
          created_at?: string | null
          day_number?: number
          estimated_hours?: number
          id?: string
          order_num?: number
          topic_name?: string
          unlock_condition?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "roadmap_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          allowed_classes: Json | null
          code: string
          created_at: string
          exam_type: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          address?: string | null
          allowed_classes?: Json | null
          code: string
          created_at?: string
          exam_type?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          address?: string | null
          allowed_classes?: Json | null
          code?: string
          created_at?: string
          exam_type?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_schools_exam_type"
            columns: ["exam_type"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_schools_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          badge_icon: string | null
          earned_at: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          badge_icon?: string | null
          earned_at?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          badge_icon?: string | null
          earned_at?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_analytics: {
        Row: {
          average_score: number | null
          batch_rank: number | null
          exam_domain: string | null
          exam_name: string | null
          id: string
          last_active_date: string | null
          overall_percentile: number | null
          overall_rank: number | null
          school_percentile: number | null
          school_rank: number | null
          streak_days: number | null
          student_class: string | null
          student_id: string
          tests_attempted: number | null
          total_study_time_minutes: number | null
          updated_at: string | null
          zone_percentile: number | null
          zone_rank: number | null
        }
        Insert: {
          average_score?: number | null
          batch_rank?: number | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          last_active_date?: string | null
          overall_percentile?: number | null
          overall_rank?: number | null
          school_percentile?: number | null
          school_rank?: number | null
          streak_days?: number | null
          student_class?: string | null
          student_id: string
          tests_attempted?: number | null
          total_study_time_minutes?: number | null
          updated_at?: string | null
          zone_percentile?: number | null
          zone_rank?: number | null
        }
        Update: {
          average_score?: number | null
          batch_rank?: number | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          last_active_date?: string | null
          overall_percentile?: number | null
          overall_rank?: number | null
          school_percentile?: number | null
          school_rank?: number | null
          streak_days?: number | null
          student_class?: string | null
          student_id?: string
          tests_attempted?: number | null
          total_study_time_minutes?: number | null
          updated_at?: string | null
          zone_percentile?: number | null
          zone_rank?: number | null
        }
        Relationships: []
      }
      student_chapter_order: {
        Row: {
          chapter_order: Json
          created_at: string | null
          id: string
          roadmap_id: string
          student_id: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          chapter_order: Json
          created_at?: string | null
          id?: string
          roadmap_id: string
          student_id: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          chapter_order?: Json
          created_at?: string | null
          id?: string
          roadmap_id?: string
          student_id?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_chapter_order_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "batch_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chapter_order_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chapter_order_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chapter_progress: {
        Row: {
          chapter_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          started_at: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "roadmap_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification: {
        Row: {
          created_at: string | null
          current_streak_days: number | null
          daily_attendance_xp: number | null
          exam_domain: string | null
          exam_name: string | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak_days: number | null
          referral_xp: number | null
          social_share_xp: number | null
          student_class: string | null
          student_id: string
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak_days?: number | null
          daily_attendance_xp?: number | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak_days?: number | null
          referral_xp?: number | null
          social_share_xp?: number | null
          student_class?: string | null
          student_id: string
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak_days?: number | null
          daily_attendance_xp?: number | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak_days?: number | null
          referral_xp?: number | null
          social_share_xp?: number | null
          student_class?: string | null
          student_id?: string
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_guided_paths: {
        Row: {
          completed_at: string | null
          enrolled_at: string | null
          guided_path_id: string
          id: string
          is_completed: boolean | null
          progress: number | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          enrolled_at?: string | null
          guided_path_id: string
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          enrolled_at?: string | null
          guided_path_id?: string
          id?: string
          is_completed?: boolean | null
          progress?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guided_paths_guided_path_id_fkey"
            columns: ["guided_path_id"]
            isOneToOne: false
            referencedRelation: "guided_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      student_hearts: {
        Row: {
          created_at: string | null
          current_hearts: number | null
          hearts_refill_rate: number | null
          id: string
          last_heart_lost_at: string | null
          last_heart_refill_at: string | null
          max_hearts: number | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_hearts?: number | null
          hearts_refill_rate?: number | null
          id?: string
          last_heart_lost_at?: string | null
          last_heart_refill_at?: string | null
          max_hearts?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_hearts?: number | null
          hearts_refill_rate?: number | null
          id?: string
          last_heart_lost_at?: string | null
          last_heart_refill_at?: string | null
          max_hearts?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_hearts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_hearts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_leagues: {
        Row: {
          created_at: string | null
          demoted: boolean | null
          exam_domain: string | null
          exam_name: string | null
          id: string
          league_tier: string | null
          league_week_end: string | null
          league_week_start: string | null
          promoted: boolean | null
          rank_in_league: number | null
          student_class: string | null
          student_id: string | null
          updated_at: string | null
          weekly_xp: number | null
        }
        Insert: {
          created_at?: string | null
          demoted?: boolean | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          league_tier?: string | null
          league_week_end?: string | null
          league_week_start?: string | null
          promoted?: boolean | null
          rank_in_league?: number | null
          student_class?: string | null
          student_id?: string | null
          updated_at?: string | null
          weekly_xp?: number | null
        }
        Update: {
          created_at?: string | null
          demoted?: boolean | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          league_tier?: string | null
          league_week_end?: string | null
          league_week_start?: string | null
          promoted?: boolean | null
          rank_in_league?: number | null
          student_class?: string | null
          student_id?: string | null
          updated_at?: string | null
          weekly_xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_leagues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_leagues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          game_completed: boolean | null
          game_score: number | null
          id: string
          last_activity_at: string | null
          lesson_content_id: string | null
          playground_attempts: number | null
          playground_completed: boolean | null
          started_at: string | null
          status: string | null
          steps_completed: number | null
          student_id: string | null
          svg_interactions_count: number | null
          time_spent_seconds: number | null
          topic_id: string | null
          total_steps: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          game_completed?: boolean | null
          game_score?: number | null
          id?: string
          last_activity_at?: string | null
          lesson_content_id?: string | null
          playground_attempts?: number | null
          playground_completed?: boolean | null
          started_at?: string | null
          status?: string | null
          steps_completed?: number | null
          student_id?: string | null
          svg_interactions_count?: number | null
          time_spent_seconds?: number | null
          topic_id?: string | null
          total_steps?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          game_completed?: boolean | null
          game_score?: number | null
          id?: string
          last_activity_at?: string | null
          lesson_content_id?: string | null
          playground_attempts?: number | null
          playground_completed?: boolean | null
          started_at?: string | null
          status?: string | null
          steps_completed?: number | null
          student_id?: string | null
          svg_interactions_count?: number | null
          time_spent_seconds?: number | null
          topic_id?: string | null
          total_steps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_progress_lesson_content_id_fkey"
            columns: ["lesson_content_id"]
            isOneToOne: false
            referencedRelation: "topic_learning_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_quest_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          date: string
          id: string
          is_completed: boolean | null
          quest_id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          date?: string
          id?: string
          is_completed?: boolean | null
          quest_id: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          date?: string
          id?: string
          is_completed?: boolean | null
          quest_id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "daily_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      student_quests: {
        Row: {
          coin_reward: number | null
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          expires_at: string | null
          id: string
          quest_description: string | null
          quest_name: string
          quest_type: string
          status: string | null
          student_id: string | null
          target_type: string | null
          target_value: number | null
          xp_reward: number | null
        }
        Insert: {
          coin_reward?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          expires_at?: string | null
          id?: string
          quest_description?: string | null
          quest_name: string
          quest_type: string
          status?: string | null
          student_id?: string | null
          target_type?: string | null
          target_value?: number | null
          xp_reward?: number | null
        }
        Update: {
          coin_reward?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          expires_at?: string | null
          id?: string
          quest_description?: string | null
          quest_name?: string
          quest_type?: string
          status?: string | null
          student_id?: string | null
          target_type?: string | null
          target_value?: number | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_quests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_quests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_roadmap_progress: {
        Row: {
          completed_at: string | null
          completed_exercises: number | null
          games_completed: Json | null
          games_completed_at: string | null
          id: string
          last_accessed_at: string | null
          progress_percentage: number | null
          roadmap_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["topic_status"] | null
          student_id: string
          theory_completed: boolean | null
          theory_completed_at: string | null
          theory_xp_earned: number | null
          time_spent_minutes: number | null
          topic_id: string
          total_exercises: number | null
          total_games_xp: number | null
        }
        Insert: {
          completed_at?: string | null
          completed_exercises?: number | null
          games_completed?: Json | null
          games_completed_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          roadmap_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["topic_status"] | null
          student_id: string
          theory_completed?: boolean | null
          theory_completed_at?: string | null
          theory_xp_earned?: number | null
          time_spent_minutes?: number | null
          topic_id: string
          total_exercises?: number | null
          total_games_xp?: number | null
        }
        Update: {
          completed_at?: string | null
          completed_exercises?: number | null
          games_completed?: Json | null
          games_completed_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          roadmap_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["topic_status"] | null
          student_id?: string
          theory_completed?: boolean | null
          theory_completed_at?: string | null
          theory_xp_earned?: number | null
          time_spent_minutes?: number | null
          topic_id?: string
          total_exercises?: number | null
          total_games_xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_roadmap_progress_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "batch_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_roadmap_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_roadmaps: {
        Row: {
          batch_roadmap_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          progress: number | null
          status: string | null
          student_id: string
          subject_order: Json | null
          updated_at: string | null
        }
        Insert: {
          batch_roadmap_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          progress?: number | null
          status?: string | null
          student_id: string
          subject_order?: Json | null
          updated_at?: string | null
        }
        Update: {
          batch_roadmap_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          progress?: number | null
          status?: string | null
          student_id?: string
          subject_order?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_roadmaps_batch_roadmap_id_fkey"
            columns: ["batch_roadmap_id"]
            isOneToOne: false
            referencedRelation: "batch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topic_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          started_at: string | null
          status: string | null
          student_id: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_configurations: {
        Row: {
          chapters_per_day: number | null
          created_at: string | null
          id: string
          parallel_study_enabled: boolean | null
          roadmap_id: string | null
          study_days_per_week: Json | null
          updated_at: string | null
          weekly_subject_distribution: Json | null
        }
        Insert: {
          chapters_per_day?: number | null
          created_at?: string | null
          id?: string
          parallel_study_enabled?: boolean | null
          roadmap_id?: string | null
          study_days_per_week?: Json | null
          updated_at?: string | null
          weekly_subject_distribution?: Json | null
        }
        Update: {
          chapters_per_day?: number | null
          created_at?: string | null
          id?: string
          parallel_study_enabled?: boolean | null
          roadmap_id?: string | null
          study_days_per_week?: Json | null
          updated_at?: string | null
          weekly_subject_distribution?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "study_configurations_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "batch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      study_content: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          chapter_name: string
          content: string
          content_type: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          order_num: number | null
          source_id: string | null
          subject: string
          target_board: Database["public"]["Enums"]["education_board"] | null
          target_class: Database["public"]["Enums"]["student_class"] | null
          topic_name: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          chapter_name: string
          content: string
          content_type?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          order_num?: number | null
          source_id?: string | null
          subject: string
          target_board?: Database["public"]["Enums"]["education_board"] | null
          target_class?: Database["public"]["Enums"]["student_class"] | null
          topic_name: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          chapter_name?: string
          content?: string
          content_type?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          order_num?: number | null
          source_id?: string | null
          subject?: string
          target_board?: Database["public"]["Enums"]["education_board"] | null
          target_class?: Database["public"]["Enums"]["student_class"] | null
          topic_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_content_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_content_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_content_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "content_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_analytics: {
        Row: {
          average_score: number | null
          best_score: number | null
          created_at: string | null
          exam_domain: string | null
          exam_name: string | null
          id: string
          last_test_date: string | null
          mastery_level: string | null
          student_class: string | null
          student_id: string
          subject: string
          subject_percentile: number | null
          subject_rank: number | null
          tests_taken: number | null
          total_marks_obtained: number | null
          total_marks_possible: number | null
          updated_at: string | null
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          created_at?: string | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          last_test_date?: string | null
          mastery_level?: string | null
          student_class?: string | null
          student_id: string
          subject: string
          subject_percentile?: number | null
          subject_rank?: number | null
          tests_taken?: number | null
          total_marks_obtained?: number | null
          total_marks_possible?: number | null
          updated_at?: string | null
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          created_at?: string | null
          exam_domain?: string | null
          exam_name?: string | null
          id?: string
          last_test_date?: string | null
          mastery_level?: string | null
          student_class?: string | null
          student_id?: string
          subject?: string
          subject_percentile?: number | null
          subject_rank?: number | null
          tests_taken?: number | null
          total_marks_obtained?: number | null
          total_marks_possible?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          option_id: string | null
          question_id: string
          selected_option: string | null
          text_answer: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          option_id?: string | null
          question_id: string
          selected_option?: string | null
          text_answer?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          option_id?: string | null
          question_id?: string
          selected_option?: string | null
          text_answer?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          achievements_awarded: Json | null
          attempt_number: number
          created_at: string | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_graded: boolean | null
          percentage: number | null
          rank: number | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["test_attempt_status"] | null
          student_id: string
          submitted_at: string | null
          test_id: string
          time_taken_minutes: number | null
          time_taken_seconds: number | null
          total_marks: number
          xp_earned: number | null
        }
        Insert: {
          achievements_awarded?: Json | null
          attempt_number?: number
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_graded?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          started_at: string
          status?: Database["public"]["Enums"]["test_attempt_status"] | null
          student_id: string
          submitted_at?: string | null
          test_id: string
          time_taken_minutes?: number | null
          time_taken_seconds?: number | null
          total_marks: number
          xp_earned?: number | null
        }
        Update: {
          achievements_awarded?: Json | null
          attempt_number?: number
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_graded?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["test_attempt_status"] | null
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          time_taken_minutes?: number | null
          time_taken_seconds?: number | null
          total_marks?: number
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          end_date: string | null
          free_test_used: boolean | null
          id: string
          includes_roadmap: boolean | null
          paid_amount: number | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          start_date: string
          status: string
          student_id: string
          subscription_name: string | null
          subscription_type: string
          updated_at: string
          weekly_tests_count: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          end_date?: string | null
          free_test_used?: boolean | null
          id?: string
          includes_roadmap?: boolean | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          start_date?: string
          status?: string
          student_id: string
          subscription_name?: string | null
          subscription_type: string
          updated_at?: string
          weekly_tests_count?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          end_date?: string | null
          free_test_used?: boolean | null
          id?: string
          includes_roadmap?: boolean | null
          paid_amount?: number | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          start_date?: string
          status?: string
          student_id?: string
          subscription_name?: string | null
          subscription_type?: string
          updated_at?: string
          weekly_tests_count?: number | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          allow_retakes: boolean | null
          class: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          difficulty: Database["public"]["Enums"]["test_difficulty"]
          duration_minutes: number
          exam_domain: string | null
          expires_at: string | null
          id: string
          instructions: string | null
          is_free: boolean | null
          is_published: boolean | null
          max_attempts: number | null
          passing_marks: number
          scheduled_at: string | null
          status: string | null
          subject: string
          target_board: Database["public"]["Enums"]["education_board"] | null
          target_class: Database["public"]["Enums"]["student_class"] | null
          title: string
          total_marks: number
          updated_at: string | null
        }
        Insert: {
          allow_retakes?: boolean | null
          class?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          difficulty: Database["public"]["Enums"]["test_difficulty"]
          duration_minutes: number
          exam_domain?: string | null
          expires_at?: string | null
          id?: string
          instructions?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_marks: number
          scheduled_at?: string | null
          status?: string | null
          subject: string
          target_board?: Database["public"]["Enums"]["education_board"] | null
          target_class?: Database["public"]["Enums"]["student_class"] | null
          title: string
          total_marks: number
          updated_at?: string | null
        }
        Update: {
          allow_retakes?: boolean | null
          class?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["test_difficulty"]
          duration_minutes?: number
          exam_domain?: string | null
          expires_at?: string | null
          id?: string
          instructions?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_marks?: number
          scheduled_at?: string | null
          status?: string | null
          subject?: string
          target_board?: Database["public"]["Enums"]["education_board"] | null
          target_class?: Database["public"]["Enums"]["student_class"] | null
          title?: string
          total_marks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_content_mapping: {
        Row: {
          content_id: string | null
          content_type: Database["public"]["Enums"]["exercise_type"]
          created_at: string | null
          difficulty: string | null
          id: string
          is_required: boolean | null
          order_num: number
          question_id: string | null
          study_content_id: string | null
          topic_id: string
          xp_value: number | null
        }
        Insert: {
          content_id?: string | null
          content_type: Database["public"]["Enums"]["exercise_type"]
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_required?: boolean | null
          order_num: number
          question_id?: string | null
          study_content_id?: string | null
          topic_id: string
          xp_value?: number | null
        }
        Update: {
          content_id?: string | null
          content_type?: Database["public"]["Enums"]["exercise_type"]
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_required?: boolean | null
          order_num?: number
          question_id?: string | null
          study_content_id?: string | null
          topic_id?: string
          xp_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_content_mapping_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "generated_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_content_mapping_study_content_id_fkey"
            columns: ["study_content_id"]
            isOneToOne: false
            referencedRelation: "study_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_content_mapping_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_learning_content: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          coin_reward: number | null
          content_order: number
          created_at: string | null
          created_by: string | null
          estimated_time_minutes: number | null
          explanation_steps: Json[] | null
          game_data: Json | null
          game_type: string | null
          generated_by: string | null
          human_reviewed: boolean | null
          id: string
          interaction_config: Json | null
          lesson_type: string
          playground_config: Json | null
          svg_data: Json | null
          svg_type: string | null
          theory_html: string | null
          theory_text: string | null
          topic_id: string | null
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          coin_reward?: number | null
          content_order: number
          created_at?: string | null
          created_by?: string | null
          estimated_time_minutes?: number | null
          explanation_steps?: Json[] | null
          game_data?: Json | null
          game_type?: string | null
          generated_by?: string | null
          human_reviewed?: boolean | null
          id?: string
          interaction_config?: Json | null
          lesson_type: string
          playground_config?: Json | null
          svg_data?: Json | null
          svg_type?: string | null
          theory_html?: string | null
          theory_text?: string | null
          topic_id?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          coin_reward?: number | null
          content_order?: number
          created_at?: string | null
          created_by?: string | null
          estimated_time_minutes?: number | null
          explanation_steps?: Json[] | null
          game_data?: Json | null
          game_type?: string | null
          generated_by?: string | null
          human_reviewed?: boolean | null
          id?: string
          interaction_config?: Json | null
          lesson_type?: string
          playground_config?: Json | null
          svg_data?: Json | null
          svg_type?: string | null
          theory_html?: string | null
          theory_text?: string | null
          topic_id?: string | null
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_learning_content_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_learning_content_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_learning_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_learning_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_learning_content_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "roadmap_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed_at: string | null
          enrollment_id: string
          id: string
          is_completed: boolean | null
          last_watched_at: string | null
          lecture_id: string
          playlist_id: string | null
          student_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          lecture_id: string
          playlist_id?: string | null
          student_id?: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          lecture_id?: string
          playlist_id?: string | null
          student_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          allowed_classes: Json | null
          code: string
          created_at: string
          description: string | null
          exam_type: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          allowed_classes?: Json | null
          code: string
          created_at?: string
          description?: string | null
          exam_type?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          allowed_classes?: Json | null
          code?: string
          created_at?: string
          description?: string | null
          exam_type?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_zones_exam_type"
            columns: ["exam_type"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      limited_leaderboards: {
        Row: {
          percentage: number | null
          score: number | null
          score_rank: number | null
          student_class: Database["public"]["Enums"]["student_class"] | null
          student_name: string | null
          subject: string | null
          test_id: string | null
          test_title: string | null
          total_marks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          batch_id: string | null
          full_name: string | null
          id: string | null
          school_id: string | null
          student_class: Database["public"]["Enums"]["student_class"] | null
          zone_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          batch_id?: string | null
          full_name?: string | null
          id?: string | null
          school_id?: string | null
          student_class?: Database["public"]["Enums"]["student_class"] | null
          zone_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          batch_id?: string | null
          full_name?: string | null
          id?: string | null
          school_id?: string | null
          student_class?: Database["public"]["Enums"]["student_class"] | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_school"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_zone"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      test_leaderboards: {
        Row: {
          accuracy_rank: number | null
          batch_id: string | null
          id: string | null
          percentage: number | null
          score: number | null
          score_rank: number | null
          speed_rank: number | null
          student_class: Database["public"]["Enums"]["student_class"] | null
          student_id: string | null
          student_name: string | null
          subject: string | null
          submitted_at: string | null
          test_id: string | null
          test_title: string | null
          time_taken_minutes: number | null
          total_marks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_zone_rankings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_see_question_answers: {
        Args: { question_test_id: string }
        Returns: boolean
      }
      can_view_leaderboard: {
        Args: { test_id_param: string }
        Returns: boolean
      }
      check_batch_capacity: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      generate_monthly_fees: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_accessible_leaderboard_tests: {
        Args: { user_id_param: string }
        Returns: {
          can_access: boolean
          test_id: string
          test_title: string
        }[]
      }
      get_accessible_roadmaps: {
        Args: Record<PropertyKey, never>
        Returns: {
          ai_generated_plan: Json
          batch_id: string
          batch_level: string
          batch_name: string
          created_at: string
          created_by: string
          description: string
          end_date: string
          exam_name: string
          exam_type: string
          id: string
          pdf_source_id: string
          selected_subjects: Json
          start_date: string
          status: Database["public"]["Enums"]["roadmap_status"]
          title: string
          total_days: number
          updated_at: string
        }[]
      }
      get_active_intake_batch: {
        Args: {
          p_exam_domain: string
          p_exam_name: string
          p_signup_date: string
          p_student_class: string
        }
        Returns: string
      }
      get_subscription_status: {
        Args: { student_id_param: string }
        Returns: {
          free_test_available: boolean
          premium_active: boolean
          status: string
          subscription_type: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_active_subscription: {
        Args: { student_id_param: string }
        Returns: boolean
      }
      has_completed_test: {
        Args: { test_id_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: boolean
      }
      has_used_free_test: {
        Args: { student_id_param: string }
        Returns: boolean
      }
      refill_hearts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reorder_lectures: {
        Args: { course_id_param: string; lecture_ids: string[] }
        Returns: undefined
      }
      update_battery_level: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_leaderboard_access: {
        Args: { requesting_user_id: string; test_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      course_level: "beginner" | "intermediate" | "advanced"
      education_board:
        | "CBSE"
        | "ICSE"
        | "UP_BOARD"
        | "BIHAR_BOARD"
        | "RAJASTHAN_BOARD"
        | "MAHARASHTRA_BOARD"
        | "GUJARAT_BOARD"
        | "WEST_BENGAL_BOARD"
        | "KARNATAKA_BOARD"
        | "TAMIL_NADU_BOARD"
        | "KERALA_BOARD"
        | "ANDHRA_PRADESH_BOARD"
        | "TELANGANA_BOARD"
        | "MADHYA_PRADESH_BOARD"
        | "HARYANA_BOARD"
        | "PUNJAB_BOARD"
        | "ASSAM_BOARD"
        | "ODISHA_BOARD"
        | "JHARKHAND_BOARD"
        | "CHHATTISGARH_BOARD"
        | "UTTARAKHAND_BOARD"
        | "HIMACHAL_PRADESH_BOARD"
        | "JAMMU_KASHMIR_BOARD"
      exercise_type:
        | "theory"
        | "mcq"
        | "fill_up"
        | "true_false"
        | "match_column"
        | "subjective"
        | "drag_drop_sort"
        | "interactive_label"
      question_type: "mcq" | "subjective"
      roadmap_status: "draft" | "active" | "completed" | "archived" | "orphaned"
      student_class:
        | "1"
        | "2"
        | "3"
        | "4"
        | "5"
        | "6"
        | "7"
        | "8"
        | "9"
        | "10"
        | "11"
        | "12"
      test_attempt_status:
        | "in_progress"
        | "submitted"
        | "auto_submitted"
        | "abandoned"
      test_difficulty: "easy" | "medium" | "hard"
      topic_status: "locked" | "unlocked" | "in_progress" | "completed"
      user_role: "admin" | "student"
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
      course_level: ["beginner", "intermediate", "advanced"],
      education_board: [
        "CBSE",
        "ICSE",
        "UP_BOARD",
        "BIHAR_BOARD",
        "RAJASTHAN_BOARD",
        "MAHARASHTRA_BOARD",
        "GUJARAT_BOARD",
        "WEST_BENGAL_BOARD",
        "KARNATAKA_BOARD",
        "TAMIL_NADU_BOARD",
        "KERALA_BOARD",
        "ANDHRA_PRADESH_BOARD",
        "TELANGANA_BOARD",
        "MADHYA_PRADESH_BOARD",
        "HARYANA_BOARD",
        "PUNJAB_BOARD",
        "ASSAM_BOARD",
        "ODISHA_BOARD",
        "JHARKHAND_BOARD",
        "CHHATTISGARH_BOARD",
        "UTTARAKHAND_BOARD",
        "HIMACHAL_PRADESH_BOARD",
        "JAMMU_KASHMIR_BOARD",
      ],
      exercise_type: [
        "theory",
        "mcq",
        "fill_up",
        "true_false",
        "match_column",
        "subjective",
        "drag_drop_sort",
        "interactive_label",
      ],
      question_type: ["mcq", "subjective"],
      roadmap_status: ["draft", "active", "completed", "archived", "orphaned"],
      student_class: [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ],
      test_attempt_status: [
        "in_progress",
        "submitted",
        "auto_submitted",
        "abandoned",
      ],
      test_difficulty: ["easy", "medium", "hard"],
      topic_status: ["locked", "unlocked", "in_progress", "completed"],
      user_role: ["admin", "student"],
    },
  },
} as const
