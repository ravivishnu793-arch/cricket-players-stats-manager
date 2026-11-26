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
      announcements: {
        Row: {
          announcement_date: string
          created_at: string | null
          description: string
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_date?: string
          created_at?: string | null
          description: string
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_date?: string
          created_at?: string | null
          description?: string
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      batting_stats: {
        Row: {
          balls_faced: number | null
          created_at: string | null
          fours: number | null
          highest_score: number | null
          id: string
          innings: number | null
          not_outs: number | null
          player_id: string
          runs: number | null
          sixes: number | null
          updated_at: string | null
        }
        Insert: {
          balls_faced?: number | null
          created_at?: string | null
          fours?: number | null
          highest_score?: number | null
          id?: string
          innings?: number | null
          not_outs?: number | null
          player_id: string
          runs?: number | null
          sixes?: number | null
          updated_at?: string | null
        }
        Update: {
          balls_faced?: number | null
          created_at?: string | null
          fours?: number | null
          highest_score?: number | null
          id?: string
          innings?: number | null
          not_outs?: number | null
          player_id?: string
          runs?: number | null
          sixes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batting_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      bowling_stats: {
        Row: {
          best_bowling: string | null
          created_at: string | null
          four_wickets: number | null
          id: string
          innings: number | null
          matches: number | null
          overs_bowled: number | null
          player_id: string
          runs_conceded: number | null
          three_wickets: number | null
          updated_at: string | null
          wickets: number | null
        }
        Insert: {
          best_bowling?: string | null
          created_at?: string | null
          four_wickets?: number | null
          id?: string
          innings?: number | null
          matches?: number | null
          overs_bowled?: number | null
          player_id: string
          runs_conceded?: number | null
          three_wickets?: number | null
          updated_at?: string | null
          wickets?: number | null
        }
        Update: {
          best_bowling?: string | null
          created_at?: string | null
          four_wickets?: number | null
          id?: string
          innings?: number | null
          matches?: number | null
          overs_bowled?: number | null
          player_id?: string
          runs_conceded?: number | null
          three_wickets?: number | null
          updated_at?: string | null
          wickets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bowling_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_batting: {
        Row: {
          balls: number
          created_at: string | null
          dismissal: string | null
          fours: number
          id: string
          match_id: string
          not_out: boolean
          player_id: string
          position: number | null
          runs: number
          sixes: number
          team_id: string | null
        }
        Insert: {
          balls?: number
          created_at?: string | null
          dismissal?: string | null
          fours?: number
          id?: string
          match_id: string
          not_out?: boolean
          player_id: string
          position?: number | null
          runs?: number
          sixes?: number
          team_id?: string | null
        }
        Update: {
          balls?: number
          created_at?: string | null
          dismissal?: string | null
          fours?: number
          id?: string
          match_id?: string
          not_out?: boolean
          player_id?: string
          position?: number | null
          runs?: number
          sixes?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_batting_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_batting_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_batting_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_bowling: {
        Row: {
          balls: number
          created_at: string | null
          id: string
          maidens: number
          match_id: string
          no_balls: number
          player_id: string
          runs: number
          team_id: string | null
          wickets: number
          wides: number
        }
        Insert: {
          balls?: number
          created_at?: string | null
          id?: string
          maidens?: number
          match_id: string
          no_balls?: number
          player_id: string
          runs?: number
          team_id?: string | null
          wickets?: number
          wides?: number
        }
        Update: {
          balls?: number
          created_at?: string | null
          id?: string
          maidens?: number
          match_id?: string
          no_balls?: number
          player_id?: string
          runs?: number
          team_id?: string | null
          wickets?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_bowling_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bowling_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_bowling_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_fielding: {
        Row: {
          catches: number
          created_at: string | null
          id: string
          match_id: string
          player_id: string
          run_outs: number
          stumpings: number
        }
        Insert: {
          catches?: number
          created_at?: string | null
          id?: string
          match_id: string
          player_id: string
          run_outs?: number
          stumpings?: number
        }
        Update: {
          catches?: number
          created_at?: string | null
          id?: string
          match_id?: string
          player_id?: string
          run_outs?: number
          stumpings?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_fielding_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_fielding_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          created_by: string | null
          format: string | null
          id: string
          import_id: string | null
          match_date: string
          overs_limit: number | null
          result: string | null
          status: string | null
          target: number | null
          team1_balls: number | null
          team1_id: string | null
          team1_runs: number | null
          team1_wickets: number | null
          team2_balls: number | null
          team2_id: string | null
          team2_runs: number | null
          team2_wickets: number | null
          title: string | null
          toss_decision: string | null
          toss_winner_id: string | null
          tournament: string | null
          updated_at: string | null
          venue: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          format?: string | null
          id?: string
          import_id?: string | null
          match_date: string
          overs_limit?: number | null
          result?: string | null
          status?: string | null
          target?: number | null
          team1_balls?: number | null
          team1_id?: string | null
          team1_runs?: number | null
          team1_wickets?: number | null
          team2_balls?: number | null
          team2_id?: string | null
          team2_runs?: number | null
          team2_wickets?: number | null
          title?: string | null
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament?: string | null
          updated_at?: string | null
          venue?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          format?: string | null
          id?: string
          import_id?: string | null
          match_date?: string
          overs_limit?: number | null
          result?: string | null
          status?: string | null
          target?: number | null
          team1_balls?: number | null
          team1_id?: string | null
          team1_runs?: number | null
          team1_wickets?: number | null
          team2_balls?: number | null
          team2_id?: string | null
          team2_runs?: number | null
          team2_wickets?: number | null
          title?: string | null
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament?: string | null
          updated_at?: string | null
          venue?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_toss_winner_id_fkey"
            columns: ["toss_winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_imports: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          errors: string[] | null
          extracted: Json | null
          file_name: string
          file_path: string | null
          id: string
          match_id: string | null
          players_detected: number | null
          players_matched: number | null
          players_new: number | null
          reviewed: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          errors?: string[] | null
          extracted?: Json | null
          file_name: string
          file_path?: string | null
          id?: string
          match_id?: string | null
          players_detected?: number | null
          players_matched?: number | null
          players_new?: number | null
          reviewed?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          errors?: string[] | null
          extracted?: Json | null
          file_name?: string
          file_path?: string | null
          id?: string
          match_id?: string | null
          players_detected?: number | null
          players_matched?: number | null
          players_new?: number | null
          reviewed?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_imports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      player_aliases: {
        Row: {
          alias: string
          alias_normalized: string
          created_at: string | null
          id: string
          player_id: string
        }
        Insert: {
          alias: string
          alias_normalized: string
          created_at?: string | null
          id?: string
          player_id: string
        }
        Update: {
          alias?: string
          alias_normalized?: string
          created_at?: string | null
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_aliases_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          id: string
          matches_played: number | null
          name: string
          profile_photo_url: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          matches_played?: number | null
          name: string
          profile_photo_url?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          matches_played?: number | null
          name?: string
          profile_photo_url?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      team_players: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          losses: number | null
          matches_played: number | null
          name: string
          updated_at: string | null
          vice_captain_id: string | null
          win_percentage: number | null
          wins: number | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          losses?: number | null
          matches_played?: number | null
          name: string
          updated_at?: string | null
          vice_captain_id?: string | null
          win_percentage?: number | null
          wins?: number | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          losses?: number | null
          matches_played?: number | null
          name?: string
          updated_at?: string | null
          vice_captain_id?: string | null
          win_percentage?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_vice_captain_id_fkey"
            columns: ["vice_captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_match_stats: {
        Args: { _match_id: string; _sign: number }
        Returns: undefined
      }
      delete_match_scorecard: {
        Args: { _match_id: string }
        Returns: undefined
      }
      balls_to_overs: { Args: { b: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_scorecard: {
        Args: {
          _existing_id?: string
          _import_id?: string
          _mode?: string
          _payload: Json
        }
        Returns: string
      }
      overs_to_balls: { Args: { o: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
