-- Tournament course snapshot
--
-- Probleem: `scores.hole_id` verwees direct naar `holes`. Als een baan later
-- wordt aangepast (hermeting, ander par, andere SI), veranderde dat met
-- terugwerkende kracht ook de leaderboard-berekening van oude toernooien.
--
-- Oplossing: elk toernooi krijgt bij activatie (draft -> active) een eigen
-- bevroren kopie van de holes (en, als groundwork voor de WHS playing-handicap
-- berekening, ook van de tees). `scores.hole_id` wijst voortaan naar
-- `tournament_holes` in plaats van naar `holes`.
--
-- NB: dit bestand documenteert een migratie die al rechtstreeks op productie
-- is toegepast (via Supabase MCP `apply_migration`, na drie voorafgaande
-- BEGIN...ROLLBACK dry-runs). Bij een volgende `supabase db push` moet dit
-- bestand exact overeenkomen met de al toegepaste versie
-- (20260707112626) om her-toepassing te voorkomen.

-- ==== 1. Snapshot-tabellen: bevries de baanindeling zoals gespeeld, per toernooi ====
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
CREATE INDEX idx_tournament_holes_tournament ON tournament_holes(tournament_id);

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
CREATE INDEX idx_tournament_tees_tournament ON tournament_tees(tournament_id);

-- WHS-groundwork op de live tees-tabel (bron van waarheid vanaf nu)
ALTER TABLE tees
  ADD COLUMN slope_rating INT CHECK (slope_rating BETWEEN 55 AND 155),
  ADD COLUMN course_rating NUMERIC(4,1);

-- ==== 2. RLS: alleen leesbaar voor clients; schrijven alleen via de SECURITY DEFINER trigger ====
ALTER TABLE tournament_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_tees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_holes_select_public" ON tournament_holes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_holes.tournament_id AND t.is_public = true));
CREATE POLICY "tournament_holes_select_own" ON tournament_holes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_holes.tournament_id AND t.created_by = auth.uid()));
CREATE POLICY "tournament_holes_select_recorder" ON tournament_holes FOR SELECT
  USING (EXISTS (SELECT 1 FROM access_codes ac WHERE ac.tournament_id = tournament_holes.tournament_id AND ac.is_active = true AND (ac.expires_at IS NULL OR ac.expires_at > now())));

CREATE POLICY "tournament_tees_select_public" ON tournament_tees FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_tees.tournament_id AND t.is_public = true));
CREATE POLICY "tournament_tees_select_own" ON tournament_tees FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_tees.tournament_id AND t.created_by = auth.uid()));
CREATE POLICY "tournament_tees_select_recorder" ON tournament_tees FOR SELECT
  USING (EXISTS (SELECT 1 FROM access_codes ac WHERE ac.tournament_id = tournament_tees.tournament_id AND ac.is_active = true AND (ac.expires_at IS NULL OR ac.expires_at > now())));

-- ==== 3. Backfill: toernooien die al live waren krijgen een best-effort snapshot ====
-- (Er bestaat geen eerdere historische versie voor deze migratie; dit is de
-- best beschikbare waarheid — huidige holes/tees-data op moment van migreren.)
INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
SELECT t.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters
FROM tournaments t JOIN holes h ON h.course_id = t.course_id
WHERE t.status IN ('active', 'paused', 'finished');

INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating)
SELECT t.id, te.id, te.name, te.color, te.slope_rating, te.course_rating
FROM tournaments t JOIN tees te ON te.course_id = t.course_id
WHERE t.status IN ('active', 'paused', 'finished');

-- ==== 4. Herkoppel bestaande scores aan de nieuwe snapshot-rijen, wissel dan de FK ====
ALTER TABLE scores DROP CONSTRAINT scores_hole_id_fkey;

UPDATE scores s
SET hole_id = th.id
FROM holes h, tournament_holes th
WHERE s.hole_id = h.id AND th.tournament_id = s.tournament_id AND th.number = h.number;

ALTER TABLE scores ADD CONSTRAINT scores_hole_id_fkey
  FOREIGN KEY (hole_id) REFERENCES tournament_holes(id);

-- ==== 5. Herkoppel afhankelijke views van `holes` naar `tournament_holes` ====
CREATE OR REPLACE VIEW tournament_leaderboard AS
WITH scored AS (
  SELECT tp.id AS player_id, tp.name AS player_name, tp.handicap, tp.status AS player_status,
    f.name AS flight_name, f.sort_order AS flight_sort_order, f.tee_number AS started_on_hole,
    t.id AS tournament_id, t.name AS tournament_name, t.format, t.scoring_type,
    s.round_number, s.strokes, h.par, h.stroke_index,
    (s.strokes - h.par) AS hole_to_par,
    (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, 0::double precision)))::integer THEN 1 ELSE 0 END) AS net_strokes,
    CASE WHEN s.strokes <= h.par - 2 THEN 4 WHEN s.strokes = h.par - 1 THEN 3 WHEN s.strokes = h.par THEN 2 WHEN s.strokes = h.par + 1 THEN 1 ELSE 0 END AS gross_stableford,
    CASE
      WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, 0::double precision)))::integer THEN 1 ELSE 0 END) <= h.par - 2 THEN 4
      WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, 0::double precision)))::integer THEN 1 ELSE 0 END) = h.par - 1 THEN 3
      WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, 0::double precision)))::integer THEN 1 ELSE 0 END) = h.par THEN 2
      WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, 0::double precision)))::integer THEN 1 ELSE 0 END) = h.par + 1 THEN 1
      ELSE 0
    END AS net_stableford,
    max(s.round_number) OVER (PARTITION BY tp.id) AS max_round
  FROM tournament_players tp
    JOIN tournaments t ON tp.tournament_id = t.id
    LEFT JOIN flights f ON tp.flight_id = f.id
    LEFT JOIN scores s ON s.player_id = tp.id AND s.tournament_id = t.id
    LEFT JOIN tournament_holes h ON s.hole_id = h.id
  WHERE tp.status <> 'withdrawn'::text
), aggregated AS (
  SELECT scored.player_id, scored.player_name, scored.handicap, scored.player_status, scored.flight_name,
    scored.flight_sort_order, scored.started_on_hole, scored.tournament_id, scored.tournament_name, scored.format, scored.scoring_type,
    count(scored.strokes) AS holes_played, sum(scored.strokes) AS total_strokes,
    (sum(scored.strokes) - sum(scored.par)) AS score_to_par,
    sum(scored.net_strokes) AS total_net_strokes, (sum(scored.net_strokes) - sum(scored.par)) AS net_score_to_par,
    sum(scored.gross_stableford) AS gross_stableford_points, sum(scored.net_stableford) AS net_stableford_points,
    max(scored.max_round) AS max_round
  FROM scored
  GROUP BY scored.player_id, scored.player_name, scored.handicap, scored.player_status, scored.flight_name, scored.flight_sort_order, scored.started_on_hole, scored.tournament_id, scored.tournament_name, scored.format, scored.scoring_type
), round_totals AS (
  SELECT scored.player_id, scored.tournament_id, scored.round_number, sum(scored.strokes) AS round_strokes, sum(scored.hole_to_par) AS round_to_par
  FROM scored WHERE scored.round_number IS NOT NULL
  GROUP BY scored.player_id, scored.tournament_id, scored.round_number
), player_rounds AS (
  SELECT round_totals.player_id, round_totals.tournament_id,
    json_agg(json_build_object('round', round_totals.round_number, 'strokes', round_totals.round_strokes, 'to_par', round_totals.round_to_par) ORDER BY round_totals.round_number) AS round_data
  FROM round_totals GROUP BY round_totals.player_id, round_totals.tournament_id
)
SELECT a.player_id, a.player_name, a.handicap, a.player_status, a.flight_name, a.flight_sort_order,
  COALESCE(a.started_on_hole, 1) AS started_on_hole, a.tournament_id, a.tournament_name, a.format, a.scoring_type,
  a.holes_played, a.total_strokes, a.score_to_par, a.total_net_strokes, a.net_score_to_par, a.gross_stableford_points, a.net_stableford_points,
  COALESCE((SELECT count(*) FROM jsonb_array_elements(pr.round_data::jsonb) r(value) WHERE (r.value ->> 'round'::text)::integer = a.max_round AND (r.value ->> 'strokes'::text) IS NOT NULL), 0::bigint) AS today_holes,
  (SELECT (r.value ->> 'to_par'::text)::integer FROM jsonb_array_elements(pr.round_data::jsonb) r(value) WHERE (r.value ->> 'round'::text)::integer = a.max_round) AS today_score,
  (SELECT array_agg((r.value ->> 'strokes'::text)::integer ORDER BY (r.value ->> 'round'::text)::integer) FROM jsonb_array_elements(pr.round_data::jsonb) r(value)) AS round_scores,
  (SELECT array_agg((r.value ->> 'to_par'::text)::integer ORDER BY (r.value ->> 'round'::text)::integer) FROM jsonb_array_elements(pr.round_data::jsonb) r(value)) AS round_to_par,
  row_number() OVER (PARTITION BY a.tournament_id ORDER BY
    CASE WHEN a.player_status = ANY (ARRAY['dns'::text, 'dnf'::text, 'dsq'::text]) THEN 1 ELSE 0 END,
    CASE WHEN a.format = 'stableford'::text AND a.scoring_type = 'net'::text THEN -a.net_stableford_points
         WHEN a.format = 'stableford'::text AND a.scoring_type = 'gross'::text THEN -a.gross_stableford_points
         WHEN a.format = 'stroke'::text AND a.scoring_type = 'net'::text THEN a.total_net_strokes
         ELSE a.total_strokes END,
    a.holes_played DESC) AS "position"
FROM aggregated a LEFT JOIN player_rounds pr ON pr.player_id = a.player_id AND pr.tournament_id = a.tournament_id
ORDER BY (row_number() OVER (PARTITION BY a.tournament_id ORDER BY
    CASE WHEN a.player_status = ANY (ARRAY['dns'::text, 'dnf'::text, 'dsq'::text]) THEN 1 ELSE 0 END,
    CASE WHEN a.format = 'stableford'::text AND a.scoring_type = 'net'::text THEN -a.net_stableford_points
         WHEN a.format = 'stableford'::text AND a.scoring_type = 'gross'::text THEN -a.gross_stableford_points
         WHEN a.format = 'stroke'::text AND a.scoring_type = 'net'::text THEN a.total_net_strokes
         ELSE a.total_strokes END,
    a.holes_played DESC));

CREATE OR REPLACE VIEW matchplay_standings AS
 WITH hole_results AS (
  SELECT mp_1.id AS pairing_id, mp_1.tournament_id, mp_1.round_number, ha.number AS hole_number,
    sa.strokes AS strokes_a, sb.strokes AS strokes_b,
    CASE WHEN sa.strokes < sb.strokes THEN 'A' WHEN sb.strokes < sa.strokes THEN 'B' ELSE 'H' END AS result
  FROM matchplay_pairings mp_1
    JOIN scores sa ON sa.player_id = mp_1.player_a_id AND sa.tournament_id = mp_1.tournament_id
    JOIN scores sb ON sb.player_id = mp_1.player_b_id AND sb.tournament_id = mp_1.tournament_id AND sb.hole_id = sa.hole_id
    JOIN tournament_holes ha ON sa.hole_id = ha.id
 )
 SELECT mp.tournament_id, mp.round_number, mp.player_a_id, tpa.name AS player_a_name, mp.player_b_id, tpb.name AS player_b_name,
  count(CASE WHEN hr.result = 'A' THEN 1 ELSE NULL END) AS holes_won_a,
  count(CASE WHEN hr.result = 'B' THEN 1 ELSE NULL END) AS holes_won_b,
  count(CASE WHEN hr.result = 'H' THEN 1 ELSE NULL END) AS holes_halved,
  (count(CASE WHEN hr.result = 'A' THEN 1 ELSE NULL END) - count(CASE WHEN hr.result = 'B' THEN 1 ELSE NULL END)) AS standing,
  count(hr.result) AS holes_played,
  CASE
    WHEN (count(CASE WHEN hr.result = 'A' THEN 1 ELSE NULL END) - count(CASE WHEN hr.result = 'B' THEN 1 ELSE NULL END)) > 0
      THEN (count(CASE WHEN hr.result = 'A' THEN 1 ELSE NULL END) - count(CASE WHEN hr.result = 'B' THEN 1 ELSE NULL END))::text || 'up'
    WHEN (count(CASE WHEN hr.result = 'A' THEN 1 ELSE NULL END) - count(CASE WHEN hr.result = 'B' THEN 1 ELSE NULL END)) < 0
      THEN abs(count(CASE WHEN hr.result = 'A' THEN 1 ELSE NULL END) - count(CASE WHEN hr.result = 'B' THEN 1 ELSE NULL END))::text || 'dn'
    ELSE 'AS' END AS standing_text,
  array_agg(hr.result ORDER BY hr.hole_number) AS hole_results
 FROM matchplay_pairings mp
  JOIN tournament_players tpa ON tpa.id = mp.player_a_id
  JOIN tournament_players tpb ON tpb.id = mp.player_b_id
  LEFT JOIN hole_results hr ON hr.pairing_id = mp.id
 GROUP BY mp.tournament_id, mp.round_number, mp.player_a_id, tpa.name, mp.player_b_id, tpb.name;

CREATE OR REPLACE VIEW player_hole_scores AS
 SELECT tp.id AS player_id, tp.tournament_id, s.round_number, h.number AS hole_number, h.par, h.distance_meters, h.stroke_index,
  s.strokes, (s.strokes - h.par) AS to_par,
  CASE WHEN s.strokes <= h.par - 2 THEN 'eagle' WHEN s.strokes = h.par - 1 THEN 'birdie' WHEN s.strokes = h.par THEN 'par'
       WHEN s.strokes = h.par + 1 THEN 'bogey' WHEN s.strokes >= h.par + 2 THEN 'double_bogey' ELSE 'unknown' END AS score_type
 FROM tournament_players tp
  JOIN scores s ON s.player_id = tp.id AND s.tournament_id = tp.tournament_id
  JOIN tournament_holes h ON s.hole_id = h.id
 WHERE tp.status <> 'withdrawn'
 ORDER BY tp.id, s.round_number, h.number;

CREATE OR REPLACE VIEW course_hole_stats AS
 SELECT t.id AS tournament_id, h.number AS hole_number, h.par, h.distance_meters, h.stroke_index,
  round(avg(s.strokes), 2) AS average_score,
  count(*) FILTER (WHERE s.strokes <= h.par - 2) AS eagles,
  count(*) FILTER (WHERE s.strokes = h.par - 1) AS birdies,
  count(*) FILTER (WHERE s.strokes = h.par) AS pars,
  count(*) FILTER (WHERE s.strokes = h.par + 1) AS bogeys,
  count(*) FILTER (WHERE s.strokes >= h.par + 2) AS double_bogeys,
  count(*) AS total_scores
 FROM tournaments t JOIN scores s ON s.tournament_id = t.id JOIN tournament_holes h ON s.hole_id = h.id
 GROUP BY t.id, h.number, h.par, h.distance_meters, h.stroke_index
 ORDER BY h.number;

-- ==== 6. Trigger: bevries de snapshot zodra een toernooi live gaat ====
CREATE OR REPLACE FUNCTION freeze_tournament_course_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournament_holes WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
    SELECT NEW.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters FROM holes h WHERE h.course_id = NEW.course_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tournament_tees WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating)
    SELECT NEW.id, te.id, te.name, te.color, te.slope_rating, te.course_rating FROM tees te WHERE te.course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trg_freeze_tournament_course_snapshot
  AFTER UPDATE OF status ON tournaments
  FOR EACH ROW
  WHEN (OLD.status = 'draft' AND NEW.status = 'active')
  EXECUTE FUNCTION freeze_tournament_course_snapshot();
