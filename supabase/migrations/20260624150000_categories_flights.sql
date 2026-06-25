-- ============================================================
-- OpenTour — Migratie 007: Tournament Categories & Flight Generation
-- ============================================================

-- ============================================================
-- TOURNAMENT_CATEGORIES
-- Categorieën binnen een toernooi (bijv. Heren, Dames, Heren < 11.5 HCP)
-- Elke categorie is gekoppeld aan een tee-box
-- ============================================================
CREATE TABLE tournament_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  gender          TEXT CHECK (gender IN ('male', 'female', 'mixed')),
  handicap_min    FLOAT CHECK (handicap_min BETWEEN -10 AND 54),
  handicap_max    FLOAT CHECK (handicap_max BETWEEN -10 AND 54),
  tee_id          UUID REFERENCES tees(id) ON DELETE SET NULL,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, name)
);

-- ============================================================
-- FLIGHTS — uitbreiding: koppeling aan tee (ipv tee_number)
-- ============================================================
ALTER TABLE flights ADD COLUMN tee_id UUID REFERENCES tees(id) ON DELETE SET NULL;
ALTER TABLE flights ADD COLUMN category_id UUID REFERENCES tournament_categories(id) ON DELETE SET NULL;
ALTER TABLE flights ADD COLUMN max_players INT DEFAULT 4 CHECK (max_players BETWEEN 1 AND 4);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tournament_categories_tournament ON tournament_categories(tournament_id);
CREATE INDEX idx_flights_category ON flights(category_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;

-- Categorieën: publiek leesbaar; aanpasbaar door toernooi-organisator
CREATE POLICY "tournament_categories_select" ON tournament_categories
  FOR SELECT USING (true);

CREATE POLICY "tournament_categories_insert" ON tournament_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "tournament_categories_update" ON tournament_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "tournament_categories_delete" ON tournament_categories
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

-- ============================================================
-- FUNCTION: generate_flights
-- Genereert flights op basis van:
--   start_time, start_holes (array [1,10]), interval_minutes, max_players_per_flight
-- Verdeelt spelers over categorieën en startgaten
-- ============================================================
CREATE OR REPLACE FUNCTION generate_flights(
  p_tournament_id UUID,
  p_start_time TIMESTAMPTZ,
  p_start_holes INT[] DEFAULT ARRAY[1, 10],
  p_interval_minutes INT DEFAULT 8,
  p_max_players_per_flight INT DEFAULT 4
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category RECORD;
  v_hole_idx INT;
  v_hole_count INT;
  v_flight_id UUID;
  v_remaining INT;
BEGIN
  UPDATE tournament_players SET flight_id = NULL WHERE tournament_id = p_tournament_id;
  DELETE FROM flights WHERE tournament_id = p_tournament_id;

  v_hole_count := coalesce(array_length(p_start_holes, 1), 1);

  FOR v_category IN
    SELECT c.id, c.name, c.tee_id
    FROM tournament_categories c
    WHERE c.tournament_id = p_tournament_id
    ORDER BY c.sort_order, c.name
  LOOP
    FOR v_hole_idx IN 1..v_hole_count LOOP
      LOOP
        SELECT COUNT(*) INTO v_remaining
        FROM tournament_players tp
        WHERE tp.tournament_id = p_tournament_id
          AND tp.category_id = v_category.id
          AND tp.status IN ('registered', 'confirmed')
          AND tp.flight_id IS NULL;

        EXIT WHEN v_remaining = 0;

        INSERT INTO flights (tournament_id, name, start_time, tee_number, tee_id, category_id, max_players)
        VALUES (p_tournament_id,
          v_category.name || ' - Flight ' || p_start_holes[v_hole_idx] || '.' || (SELECT count(*) + 1 FROM flights WHERE tournament_id = p_tournament_id AND tee_number = p_start_holes[v_hole_idx]),
          p_start_time + ((SELECT count(*) FROM flights WHERE tournament_id = p_tournament_id AND tee_number = p_start_holes[v_hole_idx]) * p_interval_minutes || ' minutes')::interval,
          p_start_holes[v_hole_idx],
          v_category.tee_id,
          v_category.id,
          p_max_players_per_flight
        )
        RETURNING id INTO v_flight_id;

        UPDATE tournament_players
        SET flight_id = v_flight_id
        WHERE id IN (
          SELECT id FROM tournament_players
          WHERE tournament_id = p_tournament_id
            AND category_id = v_category.id
            AND status IN ('registered', 'confirmed')
            AND flight_id IS NULL
          ORDER BY handicap DESC NULLS LAST, name
          LIMIT p_max_players_per_flight
        );
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- FUNCTION: assign_player_category
-- Wijst een speler toe aan een categorie op basis van handicap en geslacht
-- ============================================================
CREATE OR REPLACE FUNCTION assign_player_category(
  p_player_id UUID,
  p_handicap FLOAT,
  p_gender TEXT DEFAULT 'mixed'
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  SELECT c.id INTO v_category_id
  FROM tournament_players tp
  JOIN tournament_categories c ON c.tournament_id = tp.tournament_id
  WHERE tp.id = p_player_id
    AND (c.gender IS NULL OR c.gender = p_gender OR c.gender = 'mixed')
    AND (c.handicap_min IS NULL OR p_handicap >= c.handicap_min)
    AND (c.handicap_max IS NULL OR p_handicap <= c.handicap_max)
  ORDER BY c.sort_order
  LIMIT 1;

  IF v_category_id IS NOT NULL THEN
    UPDATE tournament_players SET category_id = v_category_id WHERE id = p_player_id;
  END IF;

  RETURN v_category_id;
END;
$$;

-- ============================================================
-- TOURNAMENT_PLAYERS — voeg category_id toe
-- ============================================================
ALTER TABLE tournament_players ADD COLUMN category_id UUID REFERENCES tournament_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_tournament_players_category ON tournament_players(category_id);