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
      batches: {
        Row: {
          created_at: string | null
          current_strength: number | null
          description: string | null
          end_date: string | null
          id: string
          instructor_id: string
          is_active: boolean | null
          level: string
          max_capacity: number
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_strength?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructor_id: string
          is_active?: boolean | null
          level: string
          max_capacity: number
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_strength?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          level?: string
          max_capacity?: number
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          batch_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          batch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          batch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
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
          correct_answer: string | null
          created_at: string | null
          explanation: string | null
          id: string
          marks: number
          options: Json | null
          order_num: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          marks: number
          options?: Json | null
          order_num: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json | null
          order_num?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id?: string
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
      student_analytics: {
        Row: {
          average_score: number | null
          batch_rank: number | null
          id: string
          last_active_date: string | null
          overall_rank: number | null
          streak_days: number | null
          student_id: string
          tests_attempted: number | null
          total_study_time_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          average_score?: number | null
          batch_rank?: number | null
          id?: string
          last_active_date?: string | null
          overall_rank?: number | null
          streak_days?: number | null
          student_id: string
          tests_attempted?: number | null
          total_study_time_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          average_score?: number | null
          batch_rank?: number | null
          id?: string
          last_active_date?: string | null
          overall_rank?: number | null
          streak_days?: number | null
          student_id?: string
          tests_attempted?: number | null
          total_study_time_minutes?: number | null
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
          total_marks: number
        }
        Insert: {
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
          total_marks: number
        }
        Update: {
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
          total_marks?: number
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
      tests: {
        Row: {
          allow_retakes: boolean | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          difficulty: Database["public"]["Enums"]["test_difficulty"]
          duration_minutes: number
          expires_at: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          max_attempts: number | null
          passing_marks: number
          scheduled_at: string | null
          subject: string
          title: string
          total_marks: number
          updated_at: string | null
        }
        Insert: {
          allow_retakes?: boolean | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          difficulty: Database["public"]["Enums"]["test_difficulty"]
          duration_minutes: number
          expires_at?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_marks: number
          scheduled_at?: string | null
          subject: string
          title: string
          total_marks: number
          updated_at?: string | null
        }
        Update: {
          allow_retakes?: boolean | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["test_difficulty"]
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_marks?: number
          scheduled_at?: string | null
          subject?: string
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
          video_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          video_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          video_id?: string
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
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          chapter: number
          course_id: string
          created_at: string | null
          description: string | null
          duration_seconds: number
          id: string
          is_published: boolean | null
          order_num: number
          thumbnail: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          video_url: string
          watch_count: number | null
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
          thumbnail?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          video_url: string
          watch_count?: number | null
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
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          video_url?: string
          watch_count?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
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
    }
    Enums: {
      course_level: "beginner" | "intermediate" | "advanced"
      question_type: "mcq" | "subjective"
      test_attempt_status:
        | "in_progress"
        | "submitted"
        | "auto_submitted"
        | "abandoned"
      test_difficulty: "easy" | "medium" | "hard"
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
      question_type: ["mcq", "subjective"],
      test_attempt_status: [
        "in_progress",
        "submitted",
        "auto_submitted",
        "abandoned",
      ],
      test_difficulty: ["easy", "medium", "hard"],
      user_role: ["admin", "student"],
    },
  },
} as const
