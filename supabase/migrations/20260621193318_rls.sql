-- ============================================================
-- OpenTour — Migratie 004: Row Level Security
-- ============================================================

-- RLS inschakelen op alle tabellen
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE holes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchplay_pairings  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- COURSES
-- Publieke banen zijn voor iedereen leesbaar
-- ============================================================
CREATE POLICY "courses_select_public" ON courses
  FOR SELECT USING (true);

CREATE POLICY "courses_insert_authenticated" ON courses
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "courses_update_own" ON courses
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- HOLES
-- Leesbaar als de baan leesbaar is
-- ============================================================
CREATE POLICY "holes_select" ON holes
  FOR SELECT USING (true);

CREATE POLICY "holes_insert" ON holes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "holes_update" ON holes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND c.created_by = auth.uid()
    )
  );

-- ============================================================
-- TOURNAMENTS
-- ============================================================

-- Publieke toernooien zijn voor iedereen zichtbaar
CREATE POLICY "tournaments_select_public" ON tournaments
  FOR SELECT USING (is_public = true AND status != 'draft');

-- Organisator ziet altijd eigen toernooien (ook drafts)
CREATE POLICY "tournaments_select_own" ON tournaments
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- Draft toernooien zichtbaar voor recorders met geldige code
CREATE POLICY "tournaments_select_recorder" ON tournaments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = id
        AND ac.is_active = true
        AND ac.expires_at > now()
    )
  );

-- Organisator mag eigen toernooi aanmaken
CREATE POLICY "tournaments_insert" ON tournaments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Organisator mag eigen toernooi bijwerken (incl. status wijzigen)
CREATE POLICY "tournaments_update_own" ON tournaments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- FLIGHTS
-- ============================================================
CREATE POLICY "flights_select" ON flights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
        AND (t.is_public = true OR t.created_by = auth.uid())
    )
  );

CREATE POLICY "flights_insert" ON flights
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "flights_update" ON flights
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

-- ============================================================
-- TOURNAMENT_PLAYERS
-- ============================================================
CREATE POLICY "tp_select_public" ON tournament_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.is_public = true
    )
  );

CREATE POLICY "tp_select_own" ON tournament_players
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "tp_insert" ON tournament_players
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "tp_update" ON tournament_players
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

-- ============================================================
-- SCORES
-- ============================================================

-- Publieke scores zijn alleen leesbaar voor geauthenticeerde gebruikers (geen anonieme toegang)
CREATE POLICY "scores_select_public" ON scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.is_public = true
    )
  );

-- Recorder mag scores invoeren via geldige toegangscode voor ACTIEVE toernooien
-- LET OP: WITH CHECK (niet USING) voor INSERT policies
CREATE POLICY "scores_insert_recorder" ON scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = scores.tournament_id
        AND t.status = 'active'
        AND t.is_public = true
    ) AND EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = scores.tournament_id
        AND ac.is_active = true
        AND ac.expires_at > now()
        AND ac.created_by IN (
          SELECT created_by FROM tournaments WHERE id = scores.tournament_id
        )
    )
  );

-- Recorder mag scores bijwerken voor-- Controleert op actieve toernooien en geldige toegangscode
CREATE POLICY "scores_update_recorder" ON scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = scores.tournament_id
        AND t.status = 'active'
        AND t.is_public = true
    ) AND EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = scores.tournament_id
        AND ac.is_active = true
        AND ac.expires_at > now()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = scores.tournament_id
        AND t.status = 'active'
        AND t.is_public = true
    ) AND EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = scores.tournament_id
        AND ac.is_active = true
        AND ac.expires_at > now()
    )
  );

-- Organisator heeft volledige toegang tot scores van eigen toernooi
CREATE POLICY "scores_all_organizer" ON scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

-- ============================================================
-- ACCESS_CODES
-- ============================================================
CREATE POLICY "access_codes_select_own" ON access_codes
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "access_codes_insert_own" ON access_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "access_codes_update_own" ON access_codes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Recorders mogen hun eigen actieve code inzien (voor sessievalidatie)
CREATE POLICY "access_codes_select_active" ON access_codes
  FOR SELECT TO authenticated
  USING (is_active = true AND expires_at > now());

-- ============================================================
-- MATCHPLAY_PAIRINGS
-- ============================================================
CREATE POLICY "matchplay_select" ON matchplay_pairings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.is_public = true
    )
  );

CREATE POLICY "matchplay_insert" ON matchplay_pairings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );
