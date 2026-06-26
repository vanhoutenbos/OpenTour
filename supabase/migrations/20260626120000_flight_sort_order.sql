-- ============================================================
-- OpenTour — Migratie 013: Voeg sort_order toe aan flights
--
-- Elke flight krijgt een oplopend volgnummer binnen het toernooi.
-- Dit maakt het mogelijk om te filteren op "Flight 1", "Flight 2"
-- ongeacht of er een naam is ingesteld.
-- ============================================================

ALTER TABLE flights ADD COLUMN sort_order INT;

-- Update generate_flights: vul sort_order in als globale teller per toernooi
CREATE OR REPLACE FUNCTION generate_flights(
  p_tournament_id        UUID,
  p_start_time           TIMESTAMPTZ,
  p_start_holes          INT[]     DEFAULT ARRAY[1, 10],
  p_interval_minutes     INT       DEFAULT 8,
  p_max_players_per_flight INT     DEFAULT 4,
  p_sort_by              TEXT      DEFAULT 'handicap_asc',
  p_gender_mode          TEXT      DEFAULT 'mixed'
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category      RECORD;
  v_gender        TEXT;
  v_hole_idx      INT;
  v_hole_count    INT;
  v_flight_id     UUID;
  v_remaining     INT;
  v_counters      INT[];
  v_times         TIMESTAMPTZ[];
  v_gender_arr    TEXT[];
  v_flight_name   TEXT;
  v_global_order  INT := 0;
BEGIN
  -- Wis bestaande flights en ontkoppel spelers
  UPDATE tournament_players SET flight_id = NULL
  WHERE tournament_id = p_tournament_id;

  DELETE FROM flights WHERE tournament_id = p_tournament_id;

  v_hole_count := coalesce(array_length(p_start_holes, 1), 1);
  v_counters := array_fill(0, ARRAY[v_hole_count]);
  v_times    := array_fill(p_start_time, ARRAY[v_hole_count]);

  -- Bepaal welke genders om over te itereren
  IF p_gender_mode = 'separate' THEN
    v_gender_arr := ARRAY['female', 'male', 'unknown'];
  ELSE
    v_gender_arr := ARRAY[NULL];
  END IF;

  FOR v_category IN
    SELECT c.id, c.name, c.tee_id
    FROM tournament_categories c
    WHERE c.tournament_id = p_tournament_id
    ORDER BY c.sort_order, c.name
  LOOP
    FOREACH v_gender IN ARRAY v_gender_arr
    LOOP
      v_hole_idx := 1;

      LOOP
        -- Tel resterende spelers voor deze categorie en gender
        IF v_gender IS NULL THEN
          SELECT COUNT(*) INTO v_remaining
          FROM tournament_players tp
          WHERE tp.tournament_id = p_tournament_id
            AND tp.category_id = v_category.id
            AND tp.status IN ('registered', 'confirmed')
            AND tp.flight_id IS NULL;
        ELSE
          SELECT COUNT(*) INTO v_remaining
          FROM tournament_players tp
          WHERE tp.tournament_id = p_tournament_id
            AND tp.category_id = v_category.id
            AND tp.status IN ('registered', 'confirmed')
            AND tp.flight_id IS NULL
            AND COALESCE(tp.gender, 'unknown') = v_gender;
        END IF;

        EXIT WHEN v_remaining = 0;

        v_counters[v_hole_idx] := v_counters[v_hole_idx] + 1;
        v_global_order := v_global_order + 1;

        -- Bouw de flight naam op: alleen als de categorie een naam heeft
        IF v_category.name IS NOT NULL AND trim(v_category.name) <> '' THEN
          v_flight_name := v_category.name || ' · ' || p_start_holes[v_hole_idx] || '.' || v_counters[v_hole_idx];
        ELSE
          v_flight_name := NULL;
        END IF;

        INSERT INTO flights (
          tournament_id, name, start_time,
          tee_number, tee_id, category_id, max_players, sort_order
        )
        VALUES (
          p_tournament_id,
          v_flight_name,
          v_times[v_hole_idx],
          p_start_holes[v_hole_idx],
          v_category.tee_id,
          v_category.id,
          p_max_players_per_flight,
          v_global_order
        )
        RETURNING id INTO v_flight_id;

        v_times[v_hole_idx] := v_times[v_hole_idx]
          + (p_interval_minutes || ' minutes')::interval;

        -- Wijs spelers toe op basis van sorteervolgorde
        IF p_sort_by = 'random' THEN
          IF v_gender IS NULL THEN
            UPDATE tournament_players
            SET flight_id = v_flight_id
            WHERE id IN (
              SELECT id FROM tournament_players
              WHERE tournament_id = p_tournament_id
                AND category_id = v_category.id
                AND status IN ('registered', 'confirmed')
                AND flight_id IS NULL
              ORDER BY random()
              LIMIT p_max_players_per_flight
            );
          ELSE
            UPDATE tournament_players
            SET flight_id = v_flight_id
            WHERE id IN (
              SELECT id FROM tournament_players
              WHERE tournament_id = p_tournament_id
                AND category_id = v_category.id
                AND status IN ('registered', 'confirmed')
                AND flight_id IS NULL
                AND COALESCE(gender, 'unknown') = v_gender
              ORDER BY random()
              LIMIT p_max_players_per_flight
            );
          END IF;
        ELSE
          IF v_gender IS NULL THEN
            UPDATE tournament_players
            SET flight_id = v_flight_id
            WHERE id IN (
              SELECT id FROM tournament_players
              WHERE tournament_id = p_tournament_id
                AND category_id = v_category.id
                AND status IN ('registered', 'confirmed')
                AND flight_id IS NULL
              ORDER BY handicap ASC NULLS LAST, name
              LIMIT p_max_players_per_flight
            );
          ELSE
            UPDATE tournament_players
            SET flight_id = v_flight_id
            WHERE id IN (
              SELECT id FROM tournament_players
              WHERE tournament_id = p_tournament_id
                AND category_id = v_category.id
                AND status IN ('registered', 'confirmed')
                AND flight_id IS NULL
                AND COALESCE(gender, 'unknown') = v_gender
              ORDER BY handicap ASC NULLS LAST, name
              LIMIT p_max_players_per_flight
            );
          END IF;
        END IF;

        v_hole_idx := (v_hole_idx % v_hole_count) + 1;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- Update leaderboard view om flight_sort_order mee te nemen
-- ============================================================
DROP VIEW IF EXISTS tournament_leaderboard;

CREATE VIEW tournament_leaderboard AS
WITH scored AS (
  SELECT
    tp.id                     AS player_id,
    tp.name                   AS player_name,
    tp.handicap,
    tp.status                 AS player_status,
    f.name                    AS flight_name,
    f.sort_order              AS flight_sort_order,
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
    MAX(s.round_number) OVER (PARTITION BY tp.id) AS max_round
  FROM tournament_players tp
  JOIN tournaments t    ON tp.tournament_id = t.id
  LEFT JOIN flights f   ON tp.flight_id = f.id
  LEFT JOIN scores s    ON s.player_id = tp.id AND s.tournament_id = t.id
  LEFT JOIN holes h     ON s.hole_id = h.id
  WHERE tp.status NOT IN ('withdrawn')
),
aggregated AS (
  SELECT
    player_id, player_name, handicap, player_status,
    flight_name, flight_sort_order, started_on_hole,
    tournament_id, tournament_name, format, scoring_type,
    COUNT(strokes)                AS holes_played,
    SUM(strokes)                  AS total_strokes,
    SUM(strokes) - SUM(par)       AS score_to_par,
    SUM(net_strokes)              AS total_net_strokes,
    SUM(net_strokes) - SUM(par)   AS net_score_to_par,
    SUM(gross_stableford)         AS gross_stableford_points,
    SUM(net_stableford)           AS net_stableford_points,
    MAX(max_round)                AS max_round
  FROM scored
  GROUP BY
    player_id, player_name, handicap, player_status,
    flight_name, flight_sort_order, started_on_hole,
    tournament_id, tournament_name, format, scoring_type
),
round_totals AS (
  SELECT
    player_id,
    tournament_id,
    round_number,
    SUM(strokes)     AS round_strokes,
    SUM(hole_to_par) AS round_to_par
  FROM scored
  WHERE round_number IS NOT NULL
  GROUP BY player_id, tournament_id, round_number
),
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
  a.player_id, a.player_name, a.handicap, a.player_status,
  a.flight_name, a.flight_sort_order,
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
