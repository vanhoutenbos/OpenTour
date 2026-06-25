-- ============================================================
-- OpenTour — Migratie 010: Leaderboard v2
--
-- Voegt toe:
-- - tournament_leaderboard: started_on_hole, today_holes, today_score,
--   round_scores[], round_to_par[]
-- - player_hole_scores: hole-by-hole per speler voor scorecard modal
-- - course_hole_stats: statistieken per hole
-- - matchplay_standings: round_number, standing_text, hole_results
-- ============================================================

-- ============================================================
-- TOURNAMENT_LEADERBOARD (vervangen)
-- ============================================================
DROP VIEW IF EXISTS tournament_leaderboard;

-- Per-player-per-round subquery
CREATE VIEW tournament_leaderboard AS
WITH scored AS (
  SELECT
    tp.id                     AS player_id,
    tp.name                   AS player_name,
    tp.handicap,
    tp.status                 AS player_status,
    f.name                    AS flight_name,
    f.tee_number              AS started_on_hole,
    t.id                      AS tournament_id,
    t.name                    AS tournament_name,
    t.format,
    t.scoring_type,
    s.round_number,
    s.strokes,
    h.par,
    h.stroke_index,
    s.strokes - h.par         AS hole_to_par,
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
    -- Window function voor max_round (laatste ronde met scores)
    MAX(s.round_number) OVER (PARTITION BY tp.id) AS max_round
  FROM tournament_players tp
  JOIN tournaments t    ON tp.tournament_id = t.id
  LEFT JOIN flights f   ON tp.flight_id = f.id
  LEFT JOIN scores s    ON s.player_id = tp.id AND s.tournament_id = t.id
  LEFT JOIN holes h     ON s.hole_id = h.id
  WHERE tp.status NOT IN ('withdrawn')
),
-- Per-speler totalen
aggregated AS (
  SELECT
    player_id, player_name, handicap, player_status,
    flight_name, started_on_hole, tournament_id, tournament_name,
    format, scoring_type,
    COUNT(strokes)                AS holes_played,
    SUM(strokes)                  AS total_strokes,
    SUM(strokes) - SUM(par)       AS score_to_par,
    SUM(net_strokes)              AS total_net_strokes,
    SUM(net_strokes) - SUM(par)   AS net_score_to_par,
    SUM(gross_stableford)         AS gross_stableford_points,
    SUM(net_stableford)           AS net_stableford_points,
    -- max_round is same for all rows of a player (window function), take MAX to get it
    MAX(max_round)                AS max_round
  FROM scored
  GROUP BY
    player_id, player_name, handicap, player_status, flight_name, started_on_hole,
    tournament_id, tournament_name, format, scoring_type
),
-- Per-speler-per-ronde totalen (apart om nested aggregate te voorkomen)
round_totals AS (
  SELECT
    player_id,
    tournament_id,
    round_number,
    SUM(strokes)  AS round_strokes,
    SUM(hole_to_par) AS round_to_par
  FROM scored
  WHERE round_number IS NOT NULL
  GROUP BY player_id, tournament_id, round_number
),
-- Genest: per-speler JSON van rondes
player_rounds AS (
  SELECT
    player_id,
    tournament_id,
    json_agg(
      json_build_object('round', round_number, 'strokes', round_strokes, 'to_par', round_to_par)
      ORDER BY round_number
    ) AS round_data
  FROM round_totals
  GROUP BY player_id, tournament_id
)
SELECT
  a.player_id, a.player_name, a.handicap, a.player_status, a.flight_name,
  COALESCE(a.started_on_hole, 1) AS started_on_hole,
  a.tournament_id, a.tournament_name, a.format, a.scoring_type,
  a.holes_played, a.total_strokes, a.score_to_par,
  a.total_net_strokes, a.net_score_to_par,
  a.gross_stableford_points, a.net_stableford_points,
  COALESCE(
    (SELECT COUNT(*) FROM jsonb_array_elements(pr.round_data::jsonb) AS r
     WHERE (r->>'round')::int = a.max_round AND r->>'strokes' IS NOT NULL),
  0) AS today_holes,
  (SELECT (r->>'to_par')::int FROM jsonb_array_elements(pr.round_data::jsonb) AS r
   WHERE (r->>'round')::int = a.max_round) AS today_score,
  (SELECT array_agg((r->>'strokes')::int ORDER BY (r->>'round')::int)
   FROM jsonb_array_elements(pr.round_data::jsonb) AS r) AS round_scores,
  (SELECT array_agg((r->>'to_par')::int ORDER BY (r->>'round')::int)
   FROM jsonb_array_elements(pr.round_data::jsonb) AS r) AS round_to_par,
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

-- ============================================================
-- PLAYER_HOLE_SCORES — voor de uitklapbare scorekaart
-- ============================================================
CREATE VIEW player_hole_scores AS
SELECT
  tp.id                     AS player_id,
  tp.tournament_id,
  s.round_number,
  h.number                  AS hole_number,
  h.par,
  h.distance_meters,
  h.stroke_index,
  s.strokes,
  s.strokes - h.par         AS to_par,
  CASE
    WHEN s.strokes <= h.par - 2 THEN 'eagle'
    WHEN s.strokes = h.par - 1  THEN 'birdie'
    WHEN s.strokes = h.par      THEN 'par'
    WHEN s.strokes = h.par + 1  THEN 'bogey'
    WHEN s.strokes >= h.par + 2 THEN 'double_bogey'
    ELSE 'unknown'
  END                       AS score_type
FROM tournament_players tp
JOIN scores s     ON s.player_id = tp.id AND s.tournament_id = tp.tournament_id
JOIN holes h      ON s.hole_id = h.id
WHERE tp.status NOT IN ('withdrawn')
ORDER BY tp.id, s.round_number, h.number;

-- ============================================================
-- COURSE_HOLE_STATS — statistieken per hole
-- ============================================================
CREATE VIEW course_hole_stats AS
SELECT
  t.id                      AS tournament_id,
  h.number                  AS hole_number,
  h.par,
  h.distance_meters,
  h.stroke_index,
  ROUND(AVG(s.strokes)::numeric, 2) AS average_score,
  COUNT(*) FILTER (WHERE s.strokes <= h.par - 2)  AS eagles,
  COUNT(*) FILTER (WHERE s.strokes = h.par - 1)   AS birdies,
  COUNT(*) FILTER (WHERE s.strokes = h.par)       AS pars,
  COUNT(*) FILTER (WHERE s.strokes = h.par + 1)   AS bogeys,
  COUNT(*) FILTER (WHERE s.strokes >= h.par + 2)  AS double_bogeys,
  COUNT(*)                                         AS total_scores
FROM tournaments t
JOIN scores s       ON s.tournament_id = t.id
JOIN holes h        ON s.hole_id = h.id
GROUP BY t.id, h.number, h.par, h.distance_meters, h.stroke_index
ORDER BY h.number;

-- ============================================================
-- MATCHPLAY_STANDINGS (vervangen — round_number, standing_text, hole_results)
-- ============================================================
DROP VIEW IF EXISTS matchplay_standings;
CREATE VIEW matchplay_standings AS
WITH hole_results AS (
  SELECT
    mp.id                     AS pairing_id,
    mp.tournament_id,
    s.round_number,
    ha.number                 AS hole_number,
    sa.strokes                AS strokes_a,
    sb.strokes                AS strokes_b,
    CASE
      WHEN sa.strokes < sb.strokes THEN 'A'
      WHEN sb.strokes < sa.strokes THEN 'B'
      ELSE 'H'
    END                       AS result
  FROM matchplay_pairings mp
  JOIN scores sa        ON sa.player_id = mp.player_a_id AND sa.tournament_id = mp.tournament_id
  JOIN scores sb        ON sb.player_id = mp.player_b_id AND sb.tournament_id = mp.tournament_id AND sb.hole_id = sa.hole_id
  JOIN holes ha         ON sa.hole_id = ha.id
)
SELECT
  mp.tournament_id,
  MIN(hr.round_number) AS round_number,
  mp.player_a_id,
  tpa.name                                                    AS player_a_name,
  mp.player_b_id,
  tpb.name                                                    AS player_b_name,
  COUNT(CASE WHEN hr.result = 'A' THEN 1 END)                  AS holes_won_a,
  COUNT(CASE WHEN hr.result = 'B' THEN 1 END)                  AS holes_won_b,
  COUNT(CASE WHEN hr.result = 'H' THEN 1 END)                  AS holes_halved,
  COUNT(CASE WHEN hr.result = 'A' THEN 1 END) -
    COUNT(CASE WHEN hr.result = 'B' THEN 1 END)                AS standing,
  COUNT(hr.result)                                              AS holes_played,
  CASE
    WHEN COUNT(CASE WHEN hr.result = 'A' THEN 1 END) -
         COUNT(CASE WHEN hr.result = 'B' THEN 1 END) > 0
      THEN (COUNT(CASE WHEN hr.result = 'A' THEN 1 END) -
            COUNT(CASE WHEN hr.result = 'B' THEN 1 END))::text || 'up'
    WHEN COUNT(CASE WHEN hr.result = 'A' THEN 1 END) -
         COUNT(CASE WHEN hr.result = 'B' THEN 1 END) < 0
      THEN ABS(COUNT(CASE WHEN hr.result = 'A' THEN 1 END) -
            COUNT(CASE WHEN hr.result = 'B' THEN 1 END))::text || 'dn'
    ELSE 'AS'
  END                                                          AS standing_text,
  array_agg(hr.result ORDER BY hr.hole_number)                 AS hole_results
FROM matchplay_pairings mp
JOIN tournament_players tpa  ON tpa.id = mp.player_a_id
JOIN tournament_players tpb  ON tpb.id = mp.player_b_id
LEFT JOIN hole_results hr    ON hr.pairing_id = mp.id
LEFT JOIN scores s           ON s.player_id = mp.player_a_id AND s.tournament_id = mp.tournament_id
GROUP BY
  mp.tournament_id,
  mp.player_a_id, tpa.name,
  mp.player_b_id, tpb.name;

-- Realtime voor live updates
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS scores;
