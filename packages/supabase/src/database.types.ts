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
      flights: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          start_time: string | null;
          tee_number: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['flights']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['flights']['Insert']>;
      };
      tournament_players: {
        Row: {
          id: string;
          tournament_id: string;
          flight_id: string | null;
          profile_id: string | null;
          name: string;
          email: string | null;
          handicap: number | null;
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
    };
    Views: {
      tournament_leaderboard: {
        Row: {
          player_id: string;
          player_name: string;
          handicap: number | null;
          player_status: string;
          flight_name: string | null;
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
          position: number;
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
    };
  };
}
