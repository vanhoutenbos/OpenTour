-- OpenTour — Migratie: is_recorder_for_tournament helper + RLS fixes

CREATE OR REPLACE FUNCTION is_recorder_for_tournament(p_tournament_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recorder_sessions rs
    WHERE rs.tournament_id = p_tournament_id
      AND rs.user_id = auth.uid()
      AND rs.expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old insecure recorder policies
DROP POLICY IF EXISTS "scores_insert_recorder" ON scores;
DROP POLICY IF EXISTS "scores_update_recorder" ON scores;
DROP POLICY IF EXISTS "tournaments_select_recorder" ON tournaments;

-- Public leaderboard readable without auth
DROP POLICY IF EXISTS "scores_select_public" ON scores;
CREATE POLICY "scores_select_public" ON scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.is_public = true
    )
  );

-- New secure recorder policies using helper function
CREATE POLICY "scores_insert_recorder" ON scores
  FOR INSERT TO authenticated
  WITH CHECK (
    is_recorder_for_tournament(tournament_id)
  );

CREATE POLICY "scores_update_recorder" ON scores
  FOR UPDATE TO authenticated
  USING (
    is_recorder_for_tournament(tournament_id)
  )
  WITH CHECK (
    is_recorder_for_tournament(tournament_id)
  );

CREATE POLICY "tournaments_select_recorder" ON tournaments
  FOR SELECT TO authenticated
  USING (
    is_recorder_for_tournament(id)
  );

-- Recorders mogen ook flights zien van hun toernooi
CREATE POLICY "flights_select_recorder" ON flights
  FOR SELECT TO authenticated
  USING (
    is_recorder_for_tournament(tournament_id)
  );

-- Recorders mogen ook tournament_players zien van hun toernooi
CREATE POLICY "tp_select_recorder" ON tournament_players
  FOR SELECT TO authenticated
  USING (
    is_recorder_for_tournament(tournament_id)
  );

-- Recorders mogen ook holes zien (via course) van hun toernooi
-- Holes are already public, so no change needed there

-- Matchplay: recorders mogen pairings zien van hun toernooi
CREATE POLICY "matchplay_select_recorder" ON matchplay_pairings
  FOR SELECT TO authenticated
  USING (
    is_recorder_for_tournament(tournament_id)
  );
