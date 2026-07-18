-- Fix: tournament_leaderboard joinde per ongeluk naar `holes` in plaats van
-- naar `tournament_holes` (de bevroren snapshot-tabel per toernooi, zie
-- 20260707112626_tournament_course_snapshot.sql).
--
-- `scores.hole_id` verwijst sinds die migratie naar `tournament_holes.id`,
-- niet meer naar `holes.id`. Twee latere migraties
-- (20260708125142_rename_tournament_formats.sql en
-- 20260708140000_enum_migration.sql) hebben de view opnieuw aangemaakt en
-- daarbij per ongeluk de join teruggezet naar `holes`. Gevolg: `par` kwam
-- altijd NULL terug voor elk lopend/afgesloten toernooi, waardoor
-- gross_stableford_points en net_stableford_points altijd 0 waren en
-- score_to_par / net_score_to_par altijd NULL.
--
-- Deze migratie herstelt alleen de join-tabel; de rest van de logica is
-- ongewijzigd t.o.v. de huidige live view.

DROP VIEW IF EXISTS tournament_leaderboard;

CREATE VIEW tournament_leaderboard AS
WITH scored AS (
  SELECT
    tp.id                      AS player_id,
    tp.name                    AS player_name,
    tp.handicap,
    tp.status                  AS player_status,
    f.name                     AS flight_name,
    f.sort_order                AS flight_sort_order,
    f.tee_number                AS started_on_hole,
    t.id                       AS tournament_id,
    t.name                     AS tournament_name,
    t.format,
    t.scoring_type,
    s.round_number,
    s.strokes,
    h.par,
    h.stroke_index,
    (s.strokes - h.par)        AS hole_to_par,
    s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END AS net_strokes,
    CASE
      WHEN s.strokes <= h.par - 2 THEN 4
      WHEN s.strokes = h.par - 1  THEN 3
      WHEN s.strokes = h.par      THEN 2
      WHEN s.strokes = h.par + 1  THEN 1
      ELSE 0
    END AS gross_stableford,
    CASE
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) <= h.par - 2 THEN 4
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par - 1  THEN 3
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par      THEN 2
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par + 1  THEN 1
      ELSE 0
    END AS net_stableford,
    MAX(s.round_number) OVER (PARTITION BY tp.id) AS max_round
  FROM tournament_players tp
  JOIN tournaments t   ON tp.tournament_id = t.id
  LEFT JOIN flights f  ON tp.flight_id = f.id
  LEFT JOIN scores s   ON s.player_id = tp.id AND s.tournament_id = t.id
  -- FIX: was `LEFT JOIN holes h ON s.hole_id = h.id`
  LEFT JOIN tournament_holes h ON s.hole_id = h.id
  WHERE tp.status <> 'withdrawn'::player_status
),
aggregated AS (
  SELECT
    player_id, player_name, handicap, player_status, flight_name, flight_sort_order, started_on_hole,
    tournament_id, tournament_name, format, scoring_type,
    COUNT(strokes)                    AS holes_played,
    SUM(strokes)                      AS total_strokes,
    SUM(strokes) - SUM(par)          AS score_to_par,
    SUM(net_strokes)                  AS total_net_strokes,
    SUM(net_strokes) - SUM(par)      AS net_score_to_par,
    SUM(gross_stableford)             AS gross_stableford_points,
    SUM(net_stableford)               AS net_stableford_points,
    MAX(max_round)                    AS max_round
  FROM scored
  GROUP BY player_id, player_name, handicap, player_status, flight_name, flight_sort_order, started_on_hole,
           tournament_id, tournament_name, format, scoring_type
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
    json_agg(json_build_object('round', round_number, 'strokes', round_strokes, 'to_par', round_to_par) ORDER BY round_number) AS round_data
  FROM round_totals
  GROUP BY player_id, tournament_id
)
SELECT
  a.player_id, a.player_name, a.handicap, a.player_status, a.flight_name, a.flight_sort_order,
  COALESCE(a.started_on_hole, 1) AS started_on_hole,
  a.tournament_id, a.tournament_name, a.format, a.scoring_type,
  a.holes_played, a.total_strokes, a.score_to_par, a.total_net_strokes, a.net_score_to_par,
  a.gross_stableford_points, a.net_stableford_points,
  COALESCE((
    SELECT COUNT(*) FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
    WHERE (r.value->>'round')::int = a.max_round AND (r.value->>'strokes') IS NOT NULL
  ), 0) AS today_holes,
  (
    SELECT (r.value->>'to_par')::int FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
    WHERE (r.value->>'round')::int = a.max_round
  ) AS today_score,
  (
    SELECT array_agg((r.value->>'strokes')::int ORDER BY (r.value->>'round')::int)
    FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
  ) AS round_scores,
  (
    SELECT array_agg((r.value->>'to_par')::int ORDER BY (r.value->>'round')::int)
    FROM jsonb_array_elements(pr.round_data::jsonb) r(value)
  ) AS round_to_par,
  ROW_NUMBER() OVER (
    PARTITION BY a.tournament_id
    ORDER BY
      CASE WHEN a.player_status = ANY (ARRAY['dns','dnf','dsq']::player_status[]) THEN 1 ELSE 0 END,
      CASE
        WHEN a.format = 'stableford' AND a.scoring_type = 'net'   THEN -a.net_stableford_points
        WHEN a.format = 'stableford' AND a.scoring_type = 'gross' THEN -a.gross_stableford_points
        WHEN a.format = 'strokeplay' AND a.scoring_type = 'net'   THEN a.total_net_strokes
        ELSE a.total_strokes
      END,
      a.holes_played DESC
  ) AS position
FROM aggregated a
LEFT JOIN player_rounds pr ON pr.player_id = a.player_id AND pr.tournament_id = a.tournament_id;
