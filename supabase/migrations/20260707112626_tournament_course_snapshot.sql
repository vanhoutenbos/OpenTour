-- Tournament course snapshot (slowly-changing dimension)
--
-- Probleem: `courses`, `holes` en `tees` zijn muteerbaar. Als een organisator
-- de baan wijzigt nadat een toernooi is gestart, kunnen historische scores
-- met de verkeerde par/stroke-index/rating worden geïnterpreteerd.
--
-- Oplossing: bij activering van een toernooi (status draft -> active) wordt
-- de op dat moment geldende baanconfiguratie bevroren in `tournament_holes`
-- en `tournament_tees`. Scores verwijzen vanaf nu naar `tournament_holes`
-- in plaats van naar de live `holes`-tabel.
--
-- Bekende tradeoff: de backfill voor reeds-actieve toernooien gebruikt de
-- HUIDIGE holes-data (er is geen historische baanstaat bewaard van vóór
-- deze migratie). Geaccepteerd door Jean-Paul.

-- ============================================================
-- 1. Nieuwe tabellen: bevroren snapshot per toernooi
-- ============================================================

CREATE TABLE tournament_holes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  source_hole_id  UUID REFERENCES holes(id) ON DELETE SET NULL,
  number          INT NOT NULL CHECK (number > 0),
  par             INT NOT NULL CHECK (par BETWEEN 3 AND 5),
  stroke_index    INT NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
  distance_meters INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, number),
  UNIQUE (tournament_id, stroke_index)
);

CREATE TABLE tournament_tees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  source_tee_id   UUID REFERENCES tees(id) ON DELETE SET NULL,
  name            TEXT,
  color           TEXT,
  slope_rating    INT CHECK (slope_rating BETWEEN 55 AND 155),
  course_rating   NUMERIC(4,1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournament_holes_tournament ON tournament_holes(tournament_id);
CREATE INDEX idx_tournament_tees_tournament  ON tournament_tees(tournament_id);

-- ============================================================
-- 2. WHS handicap-kolommen op de brontabel `tees`
--    (bron voor de snapshot-kolommen hierboven)
-- ============================================================

ALTER TABLE tees
  ADD COLUMN slope_rating  INT CHECK (slope_rating BETWEEN 55 AND 155),
  ADD COLUMN course_rating NUMERIC(4,1);

-- ============================================================
-- 3. RLS op de nieuwe tabellen
--    Zelfde toegangspatroon als de bestaande holes/tees-tabellen:
--    - eigenaar (organisator) altijd
--    - publiek zichtbaar als het toernooi is_public = true
--    - recorder met geldige, actieve toegangscode voor dit toernooi
-- ============================================================

ALTER TABLE tournament_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_tees  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_holes_select_own" ON tournament_holes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_holes.tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "tournament_holes_select_public" ON tournament_holes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_holes.tournament_id AND t.is_public = true
    )
  );

CREATE POLICY "tournament_holes_select_recorder" ON tournament_holes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = tournament_holes.tournament_id
        AND ac.is_active = true
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
    )
  );

CREATE POLICY "tournament_tees_select_own" ON tournament_tees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_tees.tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "tournament_tees_select_public" ON tournament_tees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_tees.tournament_id AND t.is_public = true
    )
  );

CREATE POLICY "tournament_tees_select_recorder" ON tournament_tees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = tournament_tees.tournament_id
        AND ac.is_active = true
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
    )
  );

-- ============================================================
-- 4. Trigger: bevries de baanconfiguratie bij activering
--    (status draft -> active), maar alleen als er nog geen
--    snapshot bestaat voor dit toernooi (idempotent).
-- ============================================================

CREATE OR REPLACE FUNCTION freeze_tournament_course_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournament_holes WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
    SELECT NEW.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters
    FROM holes h
    WHERE h.course_id = NEW.course_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tournament_tees WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating)
    SELECT NEW.id, te.id, te.name, te.color, te.slope_rating, te.course_rating
    FROM tees te
    WHERE te.course_id = NEW.course_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_freeze_tournament_course_snapshot
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  WHEN (OLD.status = 'draft' AND NEW.status = 'active')
  EXECUTE FUNCTION freeze_tournament_course_snapshot();

-- ============================================================
-- 5. Backfill voor reeds-actieve toernooien
--    Let op: gebruikt de HUIDIGE holes/tees-data, niet de
--    historische staat op het moment van activering (die is
--    niet bewaard). Geaccepteerde tradeoff.
-- ============================================================

INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
SELECT t.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters
FROM tournaments t
JOIN holes h ON h.course_id = t.course_id
WHERE t.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM tournament_holes th WHERE th.tournament_id = t.id);

INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating)
SELECT t.id, te.id, te.name, te.color, te.slope_rating, te.course_rating
FROM tournaments t
JOIN tees te ON te.course_id = t.course_id
WHERE t.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM tournament_tees tt WHERE tt.tournament_id = t.id);

-- ============================================================
-- 6. FK-remap: scores.hole_id wijst voortaan naar
--    tournament_holes(id) in plaats van holes(id).
--
--    Volgorde is belangrijk: de UPDATE zou de oude FK-constraint
--    schenden zolang die nog actief is, ook al bestaan de nieuwe
--    doelrijen al in dezelfde transactie.
--      1. DROP oude constraint
--      2. UPDATE scores.hole_id naar het corresponderende
--         tournament_holes.id (gematcht op tournament + hole-nummer,
--         via source_hole_id)
--      3. ADD nieuwe constraint naar tournament_holes
-- ============================================================

ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_hole_id_fkey;

UPDATE scores s
SET hole_id = th.id
FROM tournament_holes th
WHERE th.tournament_id = s.tournament_id
  AND th.source_hole_id = s.hole_id;

ALTER TABLE scores
  ADD CONSTRAINT scores_hole_id_fkey FOREIGN KEY (hole_id) REFERENCES tournament_holes(id);

-- ============================================================
-- 7. Views herschrijven: join op tournament_holes i.p.v. holes
-- ============================================================

CREATE OR REPLACE VIEW tournament_leaderboard AS
WITH scored AS (
  SELECT
    tp.id                     AS player_id,
    tp.name                   AS player_name,
    tp.handicap,
    tp.status                 AS player_status,
    f.name                    AS flight_name,
    f.sort_order               AS flight_sort_order,
    f.tee_number               AS started_on_hole,
    t.id                      AS tournament_id,
    t.name                    AS tournament_name,
    t.format,
    t.scoring_type,
    s.round_number,
    s.strokes,
    h.par,
    h.stroke_index,
    (s.strokes - h.par)       AS hole_to_par,
    s.strokes - CASE
      WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1
      ELSE 0
    END                       AS net_strokes,
    CASE
      WHEN s.strokes <= h.par - 2 THEN 4
      WHEN s.strokes = h.par - 1  THEN 3
      WHEN s.strokes = h.par      THEN 2
      WHEN s.strokes = h.par + 1  THEN 1
      ELSE 0
    END                       AS gross_stableford,
    CASE
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) <= h.par - 2 THEN 4
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par - 1  THEN 3
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par      THEN 2
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par + 1  THEN 1
      ELSE 0
    END                       AS net_stableford,
    MAX(s.round_number) OVER (PARTITION BY tp.id) AS max_round
  FROM tournament_players tp
  JOIN tournaments t          ON tp.tournament_id = t.id
  LEFT JOIN flights f         ON tp.flight_id = f.id
  LEFT JOIN scores s          ON s.player_id = tp.id AND s.tournament_id = t.id
  LEFT JOIN tournament_holes h ON s.hole_id = h.id
  WHERE tp.status <> 'withdrawn'
),
aggregated AS (
  SELECT
    player_id, player_name, handicap, player_status, flight_name,
    flight_sort_order, started_on_hole, tournament_id, tournament_name,
    format, scoring_type,
    COUNT(strokes)               AS holes_played,
    SUM(strokes)                 AS total_strokes,
    SUM(strokes) - SUM(par)      AS score_to_par,
    SUM(net_strokes)             AS total_net_strokes,
    SUM(net_strokes) - SUM(par)  AS net_score_to_par,
    SUM(gross_stableford)        AS gross_stableford_points,
    SUM(net_stableford)          AS net_stableford_points,
    MAX(max_round)               AS max_round
  FROM scored
  GROUP BY player_id, player_name, handicap, player_status, flight_name,
           flight_sort_order, started_on_hole, tournament_id, tournament_name,
           format, scoring_type
),
round_totals AS (
  SELECT
    player_id, tournament_id, round_number,
    SUM(strokes)     AS round_strokes,
    SUM(hole_to_par) AS round_to_par
  FROM scored
  WHERE round_number IS NOT NULL
  GROUP BY player_id, tournament_id, round_number
),
player_rounds AS (
  SELECT
    player_id, tournament_id,
    json_agg(
      json_build_object('round', round_number, 'strokes', round_strokes, 'to_par', round_to_par)
      ORDER BY round_number
    ) AS round_data
  FROM round_totals
  GROUP BY player_id, tournament_id
)
SELECT
  a.player_id,
  a.player_name,
  a.handicap,
  a.player_status,
  a.flight_name,
  a.flight_sort_order,
  COALESCE(a.started_on_hole, 1) AS started_on_hole,
  a.tournament_id,
  a.tournament_name,
  a.format,
  a.scoring_type,
  a.holes_played,
  a.total_strokes,
  a.score_to_par,
  a.total_net_strokes,
  a.net_score_to_par,
  a.gross_stableford_points,
  a.net_stableford_points,
  COALESCE((
    SELECT COUNT(*) FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
    WHERE (r.value->>'round')::INT = a.max_round AND (r.value->>'strokes') IS NOT NULL
  ), 0) AS today_holes,
  (
    SELECT (r.value->>'to_par')::INT FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
    WHERE (r.value->>'round')::INT = a.max_round
  ) AS today_score,
  (
    SELECT array_agg((r.value->>'strokes')::INT ORDER BY (r.value->>'round')::INT)
    FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
  ) AS round_scores,
  (
    SELECT array_agg((r.value->>'to_par')::INT ORDER BY (r.value->>'round')::INT)
    FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
  ) AS round_to_par,
  ROW_NUMBER() OVER (
    PARTITION BY a.tournament_id
    ORDER BY
      CASE WHEN a.player_status IN ('dns', 'dnf', 'dsq') THEN 1 ELSE 0 END ASC,
      CASE
        WHEN a.format = 'stableford' AND a.scoring_type = 'net'   THEN -a.net_stableford_points
        WHEN a.format = 'stableford' AND a.scoring_type = 'gross' THEN -a.gross_stableford_points
        WHEN a.format = 'stroke'     AND a.scoring_type = 'net'   THEN a.total_net_strokes
        ELSE a.total_strokes
      END ASC,
      a.holes_played DESC
  ) AS position
FROM aggregated a
LEFT JOIN player_rounds pr ON pr.player_id = a.player_id AND pr.tournament_id = a.tournament_id
ORDER BY position;

CREATE OR REPLACE VIEW matchplay_standings AS
WITH hole_results AS (
  SELECT
    mp.id             AS pairing_id,
    mp.tournament_id,
    mp.round_number,
    ha.number         AS hole_number,
    sa.strokes        AS strokes_a,
    sb.strokes        AS strokes_b,
    CASE
      WHEN sa.strokes < sb.strokes THEN 'A'
      WHEN sb.strokes < sa.strokes THEN 'B'
      ELSE 'H'
    END AS result
  FROM matchplay_pairings mp
  JOIN scores sa ON sa.player_id = mp.player_a_id AND sa.tournament_id = mp.tournament_id
  JOIN scores sb ON sb.player_id = mp.player_b_id AND sb.tournament_id = mp.tournament_id
                 AND sb.hole_id = sa.hole_id
  JOIN tournament_holes ha ON sa.hole_id = ha.id
)
SELECT
  mp.tournament_id,
  mp.round_number,
  mp.player_a_id,
  tpa.name AS player_a_name,
  mp.player_b_id,
  tpb.name AS player_b_name,
  COUNT(CASE WHEN hr.result = 'A' THEN 1 END) AS holes_won_a,
  COUNT(CASE WHEN hr.result = 'B' THEN 1 END) AS holes_won_b,
  COUNT(CASE WHEN hr.result = 'H' THEN 1 END) AS holes_halved,
  COUNT(CASE WHEN hr.result = 'A' THEN 1 END) - COUNT(CASE WHEN hr.result = 'B' THEN 1 END) AS standing,
  COUNT(hr.result) AS holes_played,
  CASE
    WHEN (COUNT(CASE WHEN hr.result = 'A' THEN 1 END) - COUNT(CASE WHEN hr.result = 'B' THEN 1 END)) > 0
      THEN (COUNT(CASE WHEN hr.result = 'A' THEN 1 END) - COUNT(CASE WHEN hr.result = 'B' THEN 1 END))::TEXT || 'up'
    WHEN (COUNT(CASE WHEN hr.result = 'A' THEN 1 END) - COUNT(CASE WHEN hr.result = 'B' THEN 1 END)) < 0
      THEN ABS(COUNT(CASE WHEN hr.result = 'A' THEN 1 END) - COUNT(CASE WHEN hr.result = 'B' THEN 1 END))::TEXT || 'dn'
    ELSE 'AS'
  END AS standing_text,
  array_agg(hr.result ORDER BY hr.hole_number) AS hole_results
FROM matchplay_pairings mp
JOIN tournament_players tpa ON tpa.id = mp.player_a_id
JOIN tournament_players tpb ON tpb.id = mp.player_b_id
LEFT JOIN hole_results hr ON hr.pairing_id = mp.id
GROUP BY mp.tournament_id, mp.round_number, mp.player_a_id, tpa.name, mp.player_b_id, tpb.name;

CREATE OR REPLACE VIEW player_hole_scores AS
SELECT
  tp.id             AS player_id,
  tp.tournament_id,
  s.round_number,
  h.number          AS hole_number,
  h.par,
  h.distance_meters,
  h.stroke_index,
  s.strokes,
  (s.strokes - h.par) AS to_par,
  CASE
    WHEN s.strokes <= h.par - 2 THEN 'eagle'
    WHEN s.strokes = h.par - 1  THEN 'birdie'
    WHEN s.strokes = h.par      THEN 'par'
    WHEN s.strokes = h.par + 1  THEN 'bogey'
    WHEN s.strokes >= h.par + 2 THEN 'double_bogey'
    ELSE 'unknown'
  END AS score_type
FROM tournament_players tp
JOIN scores s          ON s.player_id = tp.id AND s.tournament_id = tp.tournament_id
JOIN tournament_holes h ON s.hole_id = h.id
WHERE tp.status <> 'withdrawn'
ORDER BY tp.id, s.round_number, h.number;

CREATE OR REPLACE VIEW course_hole_stats AS
SELECT
  t.id              AS tournament_id,
  h.number          AS hole_number,
  h.par,
  h.distance_meters,
  h.stroke_index,
  ROUND(AVG(s.strokes), 2) AS average_score,
  COUNT(*) FILTER (WHERE s.strokes <= h.par - 2) AS eagles,
  COUNT(*) FILTER (WHERE s.strokes = h.par - 1)  AS birdies,
  COUNT(*) FILTER (WHERE s.strokes = h.par)      AS pars,
  COUNT(*) FILTER (WHERE s.strokes = h.par + 1)  AS bogeys,
  COUNT(*) FILTER (WHERE s.strokes >= h.par + 2) AS double_bogeys,
  COUNT(*)          AS total_scores
FROM tournaments t
JOIN scores s          ON s.tournament_id = t.id
JOIN tournament_holes h ON s.hole_id = h.id
GROUP BY t.id, h.number, h.par, h.distance_meters, h.stroke_index
ORDER BY h.number;
