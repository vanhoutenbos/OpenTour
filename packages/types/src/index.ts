/**
 * OpenTour — Gedeelde TypeScript types
 * Gebruikt door web app, scorer PWA en Cloudflare Worker
 */

// ============================================================
// ENUMS & UNION TYPES
// ============================================================

export type TournamentFormat = 'strokeplay' | 'stableford' | 'matchplay';
/** Structuur van het toernooi over tijd, los van format (scoringmechaniek).
 * 'single' = regulier toernooi (default). 'ladder' vereist format='matchplay'.
 * Gereserveerd voor een latere fase: 'league'. */
export type CompetitionType = 'single' | 'ladder';
export type ScoringType = 'gross' | 'net';
export type TournamentStatus = 'draft' | 'active' | 'paused' | 'finished';
export type PlayerStatus = 'registered' | 'confirmed' | 'withdrawn' | 'dns' | 'dnf' | 'dsq';
export type CourseSource = 'egolf4u' | 'custom' | 'community';
export type UserRole = 'organizer' | 'recorder';
export type Language = 'nl' | 'en';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type GenderBinary   = 'male' | 'female';
export type GenderCategory = 'male' | 'female' | 'mixed';
export type LoopType = 'full_18' | 'front_9' | 'back_9' | 'custom';
export type LadderRungGrowth = 'pyramid_double' | 'pyramid_linear';
export type LadderChallengeScope = 'rung_above' | 'n_positions_above';
export type LadderSeedingMethod = 'random' | 'handicap_asc' | 'handicap_desc';
export type LadderChallengeStatus =
  'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'forfeited';
export type LadderResultType = 'played' | 'forfeit' | 'no_show' | 'declined';

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
  is_public: boolean;
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
  /** WHS: 55–113–155, hoger = moeilijker t.o.v. scratch */
  slope_rating?: number;
  /** WHS: verwachte score van een scratch-golfer vanaf deze tee */
  course_rating?: number;
  gender: GenderBinary | null;  // nieuw: WHS-gender voor deze teebox
  created_at: string;
}

/**
 * Bevroren kopie van de holes zoals gespeeld bij dit toernooi.
 * Wordt automatisch gevuld door een DB-trigger bij de overgang draft → active,
 * zodat latere wijzigingen aan `holes` (par/SI na hermeting) oude toernooien niet beïnvloeden.
 * `scores.hole_id` verwijst naar deze tabel, niet meer naar `holes`.
 */
export interface TournamentHole {
  id: string;
  tournament_id: string;
  /** Traceerbaarheid naar de bron-hole; niet leidend, kan null zijn als de hole later verwijderd is */
  source_hole_id?: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
  distance_meters?: number;
  created_at: string;
}

/**
 * Bevroren kopie van de tees zoals bij activatie beschikbaar op de baan.
 * Groundwork voor de WHS playing-handicap-berekening (nog niet gekoppeld aan flights/categories).
 */
export interface TournamentTee {
  id: string;
  tournament_id: string;
  source_tee_id?: string;
  name?: string;
  color?: string;
  slope_rating?: number;
  course_rating?: number;
  gender: GenderCategory | null;  // nieuw: bevroren kopie van tees.gender
  created_at: string;
}

export interface Loop {
  id: string;
  course_id: string;
  name: string;
  holes_count: number;
  loop_type: LoopType;
  tee_id?: string;
  is_default: boolean;
  created_by?: string;
  created_at: string;
}

export interface LoopHole {
  id: string;
  loop_id: string;
  hole_id: string;
  tee_id?: string;
  position: number;
  distance_meters?: number;
}

/**
 * Per-lus WHS-rating override. Eén teebox (kleur + geslacht, zie `Tee`)
 * kan een andere slope_rating/course_rating hebben afhankelijk van de lus
 * die gespeeld wordt (bijv. 18 holes vs. losse voor-9 of achter-9).
 * Ontbreekt een rij voor een (loop_id, tee_id) combinatie, dan valt de
 * snapshot-trigger terug op `tees.slope_rating` / `tees.course_rating`.
 */
export interface LoopTeeRating {
  id: string;
  loop_id: string;
  tee_id: string;
  slope_rating?: number;
  course_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  course_id?: string;
  loop_id?: string;
  format: TournamentFormat;
  /** Structuur over tijd, los van format. Zie migratie
   * 20260712051028_ladder_competition_backend.sql (analyseplan §2). */
  competition_type: CompetitionType;
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
  name: string | null;
  start_time?: string;
  tee_number: number;
  tee_id?: string;
  category_id?: string;
  max_players: number;
  sort_order?: number | null;
  created_at: string;
}

export interface TournamentCategory {
  id: string;
  tournament_id: string;
  name: string;
  description?: string;
  gender?: GenderCategory;
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
  gender?: GenderBinary;
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
  round_number: number;
  created_at: string;
  /** Fase 0: handmatig ingevoerde handicapverrekening (analyseplan §6). NULL = bruto. */
  strokes_given: number | null;
  strokes_receiver_player_id: string | null;
}

export interface LadderSettings {
  tournament_id: string;
  rung_growth: LadderRungGrowth;
  top_rung_winner_count: number;
  challenge_scope: LadderChallengeScope;
  challenge_max_positions: number | null;
  handicap_allowance_pct: number;
  response_deadline_days: number;
  seeding_method: LadderSeedingMethod;
  split_pyramid_by_category: boolean;
  self_service_challenges: boolean;
  min_matches_per_period: number;
  period_length_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface LadderPosition {
  id: string;
  tournament_id: string;
  tournament_player_id: string;
  category_id: string | null;
  rung_number: number;
  position_in_rung: number;
  updated_at: string;
}

export interface LadderChallenge {
  id: string;
  tournament_id: string;
  challenger_player_id: string;
  challenged_player_id: string;
  status: LadderChallengeStatus;
  deadline_at: string;
  matchplay_pairing_id: string | null;
  winner_player_id: string | null;
  result_type: LadderResultType | null;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
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
  flight_sort_order?: number | null;
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
