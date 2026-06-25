/**
 * OpenTour — Supabase database types
 * Gegenereerd via: npx supabase gen types typescript --project-id <id>
 * Na schema wijzigingen: hergeneren en committen
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string | null;
          handicap: number | null;
          language: 'nl' | 'en';
          role: 'organizer' | 'recorder';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      courses: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          country: string;
          holes_count: number;
          source: 'egolf4u' | 'custom' | 'community';
          external_id: string | null;
          created_by: string | null;
          is_verified: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
      };
      holes: {
        Row: {
          id: string;
          course_id: string;
          number: number;
          par: number;
          stroke_index: number;
          distance_meters: number | null;
        };
        Insert: Omit<Database['public']['Tables']['holes']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['holes']['Insert']>;
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          course_id: string | null;
          format: 'stroke' | 'stableford' | 'match';
          scoring_type: 'gross' | 'net';
          rounds: number;
          status: 'draft' | 'active' | 'paused' | 'finished';
          pause_reason: string | null;
          is_public: boolean;
          start_date: string | null;
          end_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tournaments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>;
      };
      tees: {
        Row: {
          id: string;
          course_id: string;
          external_id: string;
          name: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tees']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tees']['Insert']>;
      };
      flights: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          start_time: string | null;
          tee_number: number;
          tee_id: string | null;
          category_id: string | null;
          max_players: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flights']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['flights']['Insert']>;
      };
      tournament_categories: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          description: string | null;
          gender: 'male' | 'female' | 'mixed' | null;
          handicap_min: number | null;
          handicap_max: number | null;
          tee_id: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tournament_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tournament_categories']['Insert']>;
      };
      tournament_players: {
        Row: {
          id: string;
          tournament_id: string;
          flight_id: string | null;
          category_id: string | null;
          profile_id: string | null;
          name: string;
          email: string | null;
          handicap: number | null;
          gender: 'male' | 'female' | null;
          status: 'registered' | 'confirmed' | 'withdrawn' | 'dns' | 'dnf' | 'dsq';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tournament_players']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tournament_players']['Insert']>;
      };
      scores: {
        Row: {
          id: string;
          tournament_id: string;
          player_id: string;
          hole_id: string;
          round_number: number;
          strokes: number;
          recorded_by: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['scores']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['scores']['Insert']>;
      };
      access_codes: {
        Row: {
          id: string;
          code: string;
          tournament_id: string;
          created_by: string;
          expires_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['access_codes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['access_codes']['Insert']>;
      };
      matchplay_pairings: {
        Row: {
          id: string;
          tournament_id: string;
          player_a_id: string;
          player_b_id: string;
          flight_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['matchplay_pairings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['matchplay_pairings']['Insert']>;
      };
    };
    Views: {
      tournament_leaderboard: {
        Row: {
          player_id: string;
          player_name: string;
          handicap: number | null;
          player_status: string;
          flight_name: string | null;
          started_on_hole: number;
          tournament_id: string;
          tournament_name: string;
          format: string;
          scoring_type: string;
          holes_played: number;
          total_strokes: number | null;
          score_to_par: number | null;
          total_net_strokes: number | null;
          net_score_to_par: number | null;
          gross_stableford_points: number | null;
          net_stableford_points: number | null;
          today_holes: number;
          today_score: number | null;
          round_scores: number[] | null;
          round_to_par: number[] | null;
          position: number;
        };
      };
      player_hole_scores: {
        Row: {
          player_id: string;
          tournament_id: string;
          round_number: number;
          hole_number: number;
          par: number;
          distance_meters: number | null;
          stroke_index: number;
          strokes: number;
          to_par: number;
          score_type: string;
        };
      };
      course_hole_stats: {
        Row: {
          tournament_id: string;
          hole_number: number;
          par: number;
          distance_meters: number | null;
          stroke_index: number;
          average_score: number;
          eagles: number;
          birdies: number;
          pars: number;
          bogeys: number;
          double_bogeys: number;
          total_scores: number;
        };
      };
      matchplay_standings: {
        Row: {
          tournament_id: string;
          round_number: number;
          player_a_id: string;
          player_a_name: string;
          player_b_id: string;
          player_b_name: string;
          holes_won_a: number;
          holes_won_b: number;
          holes_halved: number;
          standing: number;
          holes_played: number;
          standing_text: string;
          hole_results: string[] | null;
        };
      };
    };
    Functions: {
      upsert_score_if_newer: {
        Args: {
          p_tournament_id: string;
          p_player_id: string;
          p_hole_id: string;
          p_round_number: number;
          p_strokes: number;
          p_updated_at: string;
        };
        Returns: void;
      };
      generate_access_code: {
        Args: Record<never, never>;
        Returns: string;
      };
      generate_flights: {
        Args: {
          p_tournament_id: string;
          p_start_time: string;
          p_start_holes: number[];
          p_interval_minutes: number;
          p_max_players_per_flight: number;
          p_sort_by: string;
          p_gender_mode: string;
        };
        Returns: void;
      };
      assign_player_category: {
        Args: {
          p_player_id: string;
          p_handicap: number;
          p_gender: string;
        };
        Returns: string;
      };
    };
  };
}
