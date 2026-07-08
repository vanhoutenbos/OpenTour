-- ============================================================
-- OpenTour — Migratie 005: Leaderboard views
-- ============================================================

-- ============================================================
-- TOURNAMENT_LEADERBOARD
-- Ondersteunt stroke play (gross + net WHS) en stableford (gross + net)
-- Matchplay heeft een aparte view hieronder
-- DNS/DNF/DSQ spelers staan altijd onderaan de ranglijst
-- Tiebreaker: meeste holes gespeeld wint
-- ============================================================
CREATE VIEW tournament_leaderboard AS
WITH scored AS (
  SELECT
    tp.id                     AS player_id,
    tp.name                   AS player_name,
    tp.handicap,
    tp.status                 AS player_status,
    f.name                    AS flight_name,
    t.id                      AS tournament_id,
    t.name                    AS tournament_name,
    t.format,
    t.scoring_type,
    s.strokes,
    h.par,
    h.stroke_index,
    -- Net strokes per hole (WHS vereenvoudigd)
    -- Aftrek van 1 slag als stroke_index <= afrondend handicap
    s.strokes - CASE
      WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1
      ELSE 0
    END                       AS net_strokes,
    -- Gross stableford punten
    CASE
      WHEN s.strokes <= h.par - 2 THEN 4  -- Eagle of beter
      WHEN s.strokes = h.par - 1  THEN 3  -- Birdie
      WHEN s.strokes = h.par      THEN 2  -- Par
      WHEN s.strokes = h.par + 1  THEN 1  -- Bogey
      ELSE 0                              -- Double bogey of slechter
    END                       AS gross_stableford,
    -- Net stableford punten (op basis van net strokes)
    CASE
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) <= h.par - 2 THEN 4
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par - 1  THEN 3
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par      THEN 2
      WHEN (s.strokes - CASE WHEN h.stroke_index <= ROUND(COALESCE(tp.handicap, 0))::INT THEN 1 ELSE 0 END) = h.par + 1  THEN 1
      ELSE 0
    END                       AS net_stableford
  FROM tournament_players tp
  JOIN tournaments t    ON tp.tournament_id = t.id
  LEFT JOIN flights f   ON tp.flight_id = f.id
  LEFT JOIN scores s    ON s.player_id = tp.id AND s.tournament_id = t.id
  LEFT JOIN holes h     ON s.hole_id = h.id
  WHERE tp.status NOT IN ('withdrawn')
)
SELECT
  player_id,
  player_name,
  handicap,
  player_status,
  flight_name,
  tournament_id,
  tournament_name,
  format,
  scoring_type,
  COUNT(strokes)                AS holes_played,
  SUM(strokes)                  AS total_strokes,
  SUM(strokes) - SUM(par)       AS score_to_par,
  SUM(net_strokes)              AS total_net_strokes,
  SUM(net_strokes) - SUM(par)   AS net_score_to_par,
  SUM(gross_stableford)         AS gross_stableford_points,
  SUM(net_stableford)           AS net_stableford_points,
  ROW_NUMBER() OVER (
    PARTITION BY tournament_id
    ORDER BY
      -- DNS/DNF/DSQ altijd onderaan
      CASE WHEN player_status IN ('dns', 'dnf', 'dsq') THEN 1 ELSE 0 END ASC,
      -- Rangschikking afhankelijk van format en scoring type
      CASE
        WHEN format = 'stableford' AND scoring_type = 'net'   THEN -SUM(net_stableford)
        WHEN format = 'stableford' AND scoring_type = 'gross' THEN -SUM(gross_stableford)
        WHEN format = 'strokeplay' AND scoring_type = 'net'   THEN SUM(net_strokes)
        ELSE SUM(strokes)  -- strokeplay gross (standaard)
      END ASC,
      -- Tiebreaker: meeste holes gespeeld wint
      COUNT(strokes) DESC
  )                             AS position
FROM scored
GROUP BY
  player_id, player_name, handicap, player_status, flight_name,
  tournament_id, tournament_name, format, scoring_type;

-- ============================================================
-- MATCHPLAY_STANDINGS
-- Hole-by-hole resultaat per 1v1 pairing
-- standing > 0: speler A leidt, < 0: speler B leidt, = 0: gelijk
-- ============================================================
CREATE VIEW matchplay_standings AS
SELECT
  mp.tournament_id,
  mp.player_a_id,
  tpa.name                                                        AS player_a_name,
  mp.player_b_id,
  tpb.name                                                        AS player_b_name,
  COUNT(CASE WHEN sa.strokes < sb.strokes THEN 1 END)            AS holes_won_a,
  COUNT(CASE WHEN sb.strokes < sa.strokes THEN 1 END)            AS holes_won_b,
  COUNT(CASE WHEN sa.strokes = sb.strokes THEN 1 END)            AS holes_halved,
  COUNT(CASE WHEN sa.strokes < sb.strokes THEN 1 END) -
    COUNT(CASE WHEN sb.strokes < sa.strokes THEN 1 END)          AS standing,
  COUNT(sa.strokes)                                               AS holes_played
FROM matchplay_pairings mp
JOIN tournament_players tpa  ON tpa.id = mp.player_a_id
JOIN tournament_players tpb  ON tpb.id = mp.player_b_id
LEFT JOIN scores sa
  ON sa.player_id = mp.player_a_id
  AND sa.tournament_id = mp.tournament_id
LEFT JOIN scores sb
  ON sb.player_id = mp.player_b_id
  AND sb.tournament_id = mp.tournament_id
  AND sb.hole_id = sa.hole_id
GROUP BY
  mp.tournament_id,
  mp.player_a_id, tpa.name,
  mp.player_b_id, tpb.name;
