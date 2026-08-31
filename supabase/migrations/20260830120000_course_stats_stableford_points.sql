-- ============================================================
-- Course Stats: toon Stableford-punten in plaats van strokes
-- voor Stableford-wedstrijden.
--
-- De huidige course_hole_stats view toonde alleen round(avg(s.strokes))
-- (= gemiddelde strokes), ongeacht het wedstrijdformaat. Voor een
-- Stableford-wedstrijd zijn strokes niet het relevante cijfer: spelers
-- verdienen hier Stableford-punten mee.
--
-- Deze migratie voegt twee kolommen toe:
--   average_stableford_gross — gemiddelde bruto  Stableford-punten per hole
--   average_stableford_net   — gemiddelde netto Stableford-punten per hole
--                              (rekening houdt met spelershandicap via
--                               stroke_index, analoog aan tournament_leaderboard)
--
-- De berekening klopt in opzet met de tournament_leaderboard view
-- (migratie 20260708140000_enum_migration.sql: gross_stableford /
-- net_stableford). De CourseStats-frontend kiest op basis van
-- tournament.format + tournament.scoring_type welke kolom getoond wordt,
-- net als het leaderboard (gross voor scoring_type='gross',
-- net voor scoring_type='net').
-- ============================================================

CREATE OR REPLACE VIEW course_hole_stats AS
 SELECT t.id AS tournament_id, h.number AS hole_number, h.par, h.distance_meters, h.stroke_index,
   round(avg(s.strokes), 2) AS average_score,
   count(*) FILTER (WHERE s.strokes <= h.par - 2) AS eagles,
   count(*) FILTER (WHERE s.strokes = h.par - 1) AS birdies,
   count(*) FILTER (WHERE s.strokes = h.par) AS pars,
   count(*) FILTER (WHERE s.strokes = h.par + 1) AS bogeys,
   count(*) FILTER (WHERE s.strokes >= h.par + 2) AS double_bogeys,
   count(*) AS total_scores,
   round(avg(CASE WHEN s.strokes <= h.par - 2 THEN 4 WHEN s.strokes = h.par - 1 THEN 3 WHEN s.strokes = h.par THEN 2 WHEN s.strokes = h.par + 1 THEN 1 ELSE 0 END), 2) AS average_stableford_gross,
   round(avg(CASE
       WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer THEN 1 ELSE 0 END) <= h.par - 2 THEN 4
       WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer THEN 1 ELSE 0 END) = h.par - 1 THEN 3
       WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer THEN 1 ELSE 0 END) = h.par THEN 2
       WHEN (s.strokes - CASE WHEN h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer THEN 1 ELSE 0 END) = h.par + 1 THEN 1
       ELSE 0
   END), 2) AS average_stableford_net
 FROM tournaments t
   JOIN scores s ON s.tournament_id = t.id
   JOIN tournament_holes h ON s.hole_id = h.id
   LEFT JOIN tournament_players tp ON tp.id = s.player_id AND tp.tournament_id = t.id
 GROUP BY t.id, h.number, h.par, h.distance_meters, h.stroke_index
 ORDER BY h.number;
