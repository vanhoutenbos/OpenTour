-- ============================================================
-- MATCHPLAY_PAIRINGS ROUND TRACKING
-- ============================================================

ALTER TABLE matchplay_pairings
  ADD COLUMN IF NOT EXISTS round_number INT NOT NULL DEFAULT 1 CHECK (round_number > 0);

UPDATE matchplay_pairings
SET round_number = 1
WHERE round_number IS NULL;

DROP VIEW IF EXISTS matchplay_standings;
CREATE VIEW matchplay_standings AS
WITH hole_results AS (
  SELECT
    mp.id                     AS pairing_id,
    mp.tournament_id,
    mp.round_number,
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
  mp.round_number,
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
GROUP BY
  mp.tournament_id,
  mp.round_number,
  mp.player_a_id, tpa.name,
  mp.player_b_id, tpb.name;
