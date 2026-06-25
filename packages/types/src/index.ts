/**
 * OpenTour — Gedeelde TypeScript types
 * Gebruikt door web app, scorer PWA en Cloudflare Worker
 */

// ============================================================
// ENUMS & UNION TYPES
// ============================================================

export type TournamentFormat = 'stroke' | 'stableford' | 'match';
export type ScoringType = 'gross' | 'net';
export type TournamentStatus = 'draft' | 'active' | 'paused' | 'finished';
export type PlayerStatus = 'registered' | 'confirmed' | 'withdrawn' | 'dns' | 'dnf' | 'dsq';
export type CourseSource = 'egolf4u' | 'custom' | 'community';
export type UserRole = 'organizer' | 'recorder';
export type Language = 'nl' | 'en';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type Gender = 'male' | 'female' | 'mixed';

// ============================================================
// DATABASE ENTITEITEN
// ============================================================

export interface Profile {
  id: string;
  display_name: string;
  email?: string;
  handicap?: number;
  language: Language;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  name: string;
  location?: string;
  country: string;
  holes_count: number;
  source: CourseSource;
  external_id?: string;
  created_by?: string;
  is_verified: boolean;
  created_at: string;
}

export interface Hole {
  id: string;
  course_id: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
  distance_meters?: number;
}

export interface Tee {
  id: string;
  course_id: string;
  external_id: string;
  name?: string;
  color?: string;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  course_id?: string;
  format: TournamentFormat;
  scoring_type: ScoringType;
  rounds: number;
  status: TournamentStatus;
  pause_reason?: string;
  is_public: boolean;
  start_date?: string;
  end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Flight {
  id: string;
  tournament_id: string;
  name: string;
  start_time?: string;
  tee_number: number;
  tee_id?: string;
  category_id?: string;
  max_players: number;
  created_at: string;
}

export interface TournamentCategory {
  id: string;
  tournament_id: string;
  name: string;
  description?: string;
  gender?: Gender;
  handicap_min?: number;
  handicap_max?: number;
  tee_id?: string;
  sort_order: number;
  created_at: string;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  flight_id?: string;
  category_id?: string;
  profile_id?: string;
  name: string;
  email?: string;
  handicap?: number;
  gender?: Gender;
  status: PlayerStatus;
  created_at: string;
}

export interface Score {
  id: string;
  tournament_id: string;
  player_id: string;
  hole_id: string;
  round_number: number;
  strokes: number;
  recorded_by?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  tournament_id: string;
  created_by: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface MatchplayPairing {
  id: string;
  tournament_id: string;
  player_a_id: string;
  player_b_id: string;
  flight_id?: string;
  created_at: string;
}

// ============================================================
// VIEW TYPES (leaderboard)
// ============================================================

export interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  handicap?: number;
  player_status: PlayerStatus;
  flight_name?: string;
  tournament_id: string;
  tournament_name: string;
  format: TournamentFormat;
  scoring_type: ScoringType;
  holes_played: number;
  total_strokes?: number;
  score_to_par?: number;
  total_net_strokes?: number;
  net_score_to_par?: number;
  gross_stableford_points?: number;
  net_stableford_points?: number;
  position: number;
  /** Speler is gestart op hole 10 i.p.v. 1 */
  started_on_hole?: number;
  /** Per-ronde totaalscores: [72, 70, null, null] */
  round_scores?: (number | null)[];
  /** Per-ronde to-par: [-2, -1, null, null] */
  round_to_par?: (number | null)[];
  /** Holes gespeeld in huidige ronde (vandaag) */
  today_holes?: number;
  /** Score vandaag (to par voor huidige ronde) */
  today_score?: number;
  /** Vorige positie voor ▲▼ indicators (wordt client-side gezet) */
  previous_position?: number;
}

export interface PlayerHoleScore {
  round_number: number;
  hole_number: number;
  par: number;
  distance_meters?: number;
  stroke_index: number;
  strokes?: number;
  to_par?: number;
}

export interface PlayerRoundDetail {
  round_number: number;
  holes: PlayerHoleScore[];
  total_strokes: number;
  total_par: number;
  score_to_par: number;
}

export interface HoleStat {
  hole_number: number;
  par: number;
  distance_meters?: number;
  stroke_index: number;
  average_score: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  double_bogeys: number;
  total_scores: number;
}

export interface MatchplayStanding {
  tournament_id: string;
  round_number: number;
  player_a_id: string;
  player_a_name: string;
  player_b_id: string;
  player_b_name: string;
  holes_won_a: number;
  holes_won_b: number;
  holes_halved: number;
  standing: number; // positief = A leidt, negatief = B leidt, 0 = all square
  holes_played: number;
  /** Stand in wording: "2up", "AS", "1dn" */
  standing_text: string;
  /** Per-hole wie de hole won: 'A' | 'B' | 'H' */
  hole_results?: ('A' | 'B' | 'H')[];
}

// ============================================================
// OFFLINE / PWA TYPES
// ============================================================

export interface PendingScore {
  localId: string;
  tournament_id: string;
  player_id: string;
  hole_id: string;
  round_number: number;
  strokes: number;
  updated_at: string;
  synced: boolean;
  sync_error?: string;
}

export interface RecorderSession {
  supabaseUserId: string;
  tournamentId: string;
  accessCodeId: string;
  expiresAt: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiError {
  error: string;
  message?: string;
  retryAfter?: number;
}

export interface CodeValidationResponse {
  valid: boolean;
  tournamentId: string;
  accessCodeId: string;
}

export interface UpsertScoreInput {
  tournament_id: string;
  player_id: string;
  hole_id: string;
  round_number: number;
  strokes: number;
  updated_at: string;
}
