export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      answers: {
        Row: {
          attempt_id: string;
          chosen_option: string;
          is_correct: boolean;
          position: number;
          question_id: string;
        };
        Insert: {
          attempt_id: string;
          chosen_option: string;
          is_correct: boolean;
          position: number;
          question_id: string;
        };
        Update: {
          attempt_id?: string;
          chosen_option?: string;
          is_correct?: boolean;
          position?: number;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          chapter_id: string;
          created_at: string;
          id: string;
          level: Database["public"]["Enums"]["level"];
          retry: boolean;
          score: number;
          total: number;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          created_at?: string;
          id?: string;
          level: Database["public"]["Enums"]["level"];
          retry?: boolean;
          score: number;
          total: number;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          id?: string;
          level?: Database["public"]["Enums"]["level"];
          retry?: boolean;
          score?: number;
          total?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      beta_codes: {
        Row: {
          access_ends_at: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          disabled: boolean;
          expires_at: string | null;
          label: string;
          uses: number;
          uses_max: number;
        };
        Insert: {
          access_ends_at?: string | null;
          code: string;
          created_at?: string;
          created_by?: string | null;
          disabled?: boolean;
          expires_at?: string | null;
          label?: string;
          uses?: number;
          uses_max?: number;
        };
        Update: {
          access_ends_at?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          disabled?: boolean;
          expires_at?: string | null;
          label?: string;
          uses?: number;
          uses_max?: number;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          created_at: string;
          default_decor: Database["public"]["Enums"]["decor"];
          id: string;
          label: string;
          number: string;
          position: number;
          slug: string;
          subject_id: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_decor: Database["public"]["Enums"]["decor"];
          id?: string;
          label: string;
          number: string;
          position: number;
          slug: string;
          subject_id: string;
          summary?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_decor?: Database["public"]["Enums"]["decor"];
          id?: string;
          label?: string;
          number?: string;
          position?: number;
          slug?: string;
          subject_id?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      entitlements: {
        Row: {
          beta_code: string | null;
          created_at: string;
          ends_at: string | null;
          id: string;
          plan: Database["public"]["Enums"]["plan"];
          source: string;
          starts_at: string;
          user_id: string;
        };
        Insert: {
          beta_code?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          plan: Database["public"]["Enums"]["plan"];
          source: string;
          starts_at?: string;
          user_id: string;
        };
        Update: {
          beta_code?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["plan"];
          source?: string;
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_beta_code_fkey";
            columns: ["beta_code"];
            isOneToOne: false;
            referencedRelation: "beta_codes";
            referencedColumns: ["code"];
          },
        ];
      };
      feedback: {
        Row: {
          comment: string;
          created_at: string;
          id: string;
          question_id: string;
          rating: Database["public"]["Enums"]["feedback_rating"];
          resolved_at: string | null;
          user_id: string;
        };
        Insert: {
          comment?: string;
          created_at?: string;
          id?: string;
          question_id: string;
          rating: Database["public"]["Enums"]["feedback_rating"];
          resolved_at?: string | null;
          user_id?: string;
        };
        Update: {
          comment?: string;
          created_at?: string;
          id?: string;
          question_id?: string;
          rating?: Database["public"]["Enums"]["feedback_rating"];
          resolved_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          decor_pref: string | null;
          display_name: string;
          id: string;
          sound_pref: string | null;
          theme_pref: string | null;
          updated_at: string;
          volume: number | null;
        };
        Insert: {
          created_at?: string;
          decor_pref?: string | null;
          display_name?: string;
          id: string;
          sound_pref?: string | null;
          theme_pref?: string | null;
          updated_at?: string;
          volume?: number | null;
        };
        Update: {
          created_at?: string;
          decor_pref?: string | null;
          display_name?: string;
          id?: string;
          sound_pref?: string | null;
          theme_pref?: string | null;
          updated_at?: string;
          volume?: number | null;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          chapter_id: string;
          content_hash: string;
          correct_option: string;
          course_order: number;
          created_at: string;
          decor: Database["public"]["Enums"]["decor"] | null;
          explanation: NonNullable<Json>;
          hint: string | null;
          id: string;
          level: Database["public"]["Enums"]["level"];
          options: NonNullable<Json>;
          position: number;
          prompt: string;
          retired_at: string | null;
          review_status: Database["public"]["Enums"]["review_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          type: Database["public"]["Enums"]["question_type"];
          updated_at: string;
        };
        Insert: {
          chapter_id: string;
          content_hash: string;
          correct_option: string;
          course_order: number;
          created_at?: string;
          decor?: Database["public"]["Enums"]["decor"] | null;
          explanation: NonNullable<Json>;
          hint?: string | null;
          id: string;
          level: Database["public"]["Enums"]["level"];
          options: NonNullable<Json>;
          position: number;
          prompt: string;
          retired_at?: string | null;
          review_status?: Database["public"]["Enums"]["review_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          type: Database["public"]["Enums"]["question_type"];
          updated_at?: string;
        };
        Update: {
          chapter_id?: string;
          content_hash?: string;
          correct_option?: string;
          course_order?: number;
          created_at?: string;
          decor?: Database["public"]["Enums"]["decor"] | null;
          explanation?: NonNullable<Json>;
          hint?: string | null;
          id?: string;
          level?: Database["public"]["Enums"]["level"];
          options?: NonNullable<Json>;
          position?: number;
          prompt?: string;
          retired_at?: string | null;
          review_status?: Database["public"]["Enums"]["review_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          type?: Database["public"]["Enums"]["question_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          slug: string;
          title: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position?: number;
          slug: string;
          title: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          slug?: string;
          title?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_create_beta_codes: {
        Args: {
          p_access_ends_at?: string;
          p_code?: string;
          p_count: number;
          p_expires_at?: string;
          p_label?: string;
          p_prefix?: string;
          p_uses_max: number;
        };
        Returns: {
          access_ends_at: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          disabled: boolean;
          expires_at: string | null;
          label: string;
          uses: number;
          uses_max: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "beta_codes";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_option_stats: {
        Args: { p_question_id: string };
        Returns: {
          chosen_count: number;
          option_id: string;
        }[];
      };
      admin_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_question_stats: {
        Args: { p_subject_id?: string };
        Returns: {
          answers_count: number;
          chapter_id: string;
          chapter_label: string;
          chapter_position: number;
          correct_count: number;
          feedback_claire: number;
          feedback_erreur: number;
          feedback_open: number;
          feedback_pas_claire: number;
          level: Database["public"]["Enums"]["level"];
          prompt: string;
          question_id: string;
          question_position: number;
          retired: boolean;
          review_status: Database["public"]["Enums"]["review_status"];
          subject_id: string;
          type: Database["public"]["Enums"]["question_type"];
          users_count: number;
        }[];
      };
      admin_resolve_feedback: { Args: { p_feedback_id: string; p_resolved: boolean }; Returns: undefined };
      admin_set_beta_code_disabled: { Args: { p_code: string; p_disabled: boolean }; Returns: undefined };
      admin_set_review_status: {
        Args: { p_question_id: string; p_status: Database["public"]["Enums"]["review_status"] };
        Returns: undefined;
      };
      admin_set_subject_visibility: {
        Args: { p_subject_id: string; p_visible: boolean };
        Returns: undefined;
      };
      assert_admin: { Args: Record<PropertyKey, never>; Returns: undefined };
      can_see_question: {
        Args: {
          p_chapter_id: string;
          p_retired_at: string;
          p_status: Database["public"]["Enums"]["review_status"];
        };
        Returns: boolean;
      };
      check_beta_code: { Args: { p_code: string }; Returns: string };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      grant_beta_from_code: { Args: { p_code: string; p_user: string }; Returns: string };
      has_access: { Args: Record<PropertyKey, never>; Returns: boolean };
      has_beta_access: { Args: Record<PropertyKey, never>; Returns: boolean };
      import_subject: { Args: { p_payload: Json; p_publish?: boolean }; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      my_question_status: {
        Args: { p_chapter_id?: string };
        Returns: {
          answered: number;
          chapter_id: string;
          last_answered_at: string;
          last_correct: boolean;
          level: Database["public"]["Enums"]["level"];
          question_id: string;
        }[];
      };
      normalize_code: { Args: { p_code: string }; Returns: string };
      random_beta_code: { Args: { p_prefix: string }; Returns: string };
      redeem_beta_code: { Args: { p_code: string }; Returns: string };
      submit_attempt: {
        Args: {
          p_answers: Json;
          p_chapter_id: string;
          p_level: Database["public"]["Enums"]["level"];
          p_retry: boolean;
        };
        Returns: Json;
      };
      viewer_context: { Args: Record<PropertyKey, never>; Returns: Json };
    };
    Enums: {
      decor: "ruines" | "frontiere" | "codex" | "eglise" | "plaine" | "mer" | "chateau";
      feedback_rating: "claire" | "pas_claire" | "erreur";
      level: "facile" | "intermediaire" | "confirme";
      plan: "beta";
      question_type: "qcm" | "vrai_faux" | "cas_pratique";
      review_status: "a_relire" | "relue" | "a_corriger";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      decor: ["ruines", "frontiere", "codex", "eglise", "plaine", "mer", "chateau"],
      feedback_rating: ["claire", "pas_claire", "erreur"],
      level: ["facile", "intermediaire", "confirme"],
      plan: ["beta"],
      question_type: ["qcm", "vrai_faux", "cas_pratique"],
      review_status: ["a_relire", "relue", "a_corriger"],
    },
  },
} as const;
