-- ============================================================
-- OpenTour — Migratie 002: Indexes
-- ============================================================

-- Snelle leaderboard queries
CREATE INDEX idx_scores_tournament    ON scores(tournament_id);
CREATE INDEX idx_scores_player        ON scores(player_id);
CREATE INDEX idx_scores_updated_at    ON scores(updated_at);
CREATE INDEX idx_tp_tournament        ON tournament_players(tournament_id);
CREATE INDEX idx_tp_flight            ON tournament_players(flight_id);
CREATE INDEX idx_flights_tournament   ON flights(tournament_id);
CREATE INDEX idx_holes_course         ON holes(course_id);
CREATE INDEX idx_tournaments_status   ON tournaments(status);
CREATE INDEX idx_tournaments_created  ON tournaments(created_by);
CREATE INDEX idx_access_codes_code    ON access_codes(code);
CREATE INDEX idx_access_codes_expiry  ON access_codes(expires_at);
CREATE INDEX idx_matchplay_tournament ON matchplay_pairings(tournament_id);
