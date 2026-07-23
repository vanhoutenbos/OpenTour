-- Fix: `player_hole_scores` (gebruikt door de uitklapbare scorekaart /
-- ScorecardDrawer op het leaderboard) startte vanuit `scores` met een
-- INNER JOIN naar `tournament_holes`. Een hole zonder score-rij (nog niet
-- gespeeld) kwam daardoor helemaal niet in de view terecht.
--
-- Gevolg: als een speler op hole 1 stond, was hole 2 (en verder) volledig
-- onzichtbaar in de scorekaart-modal — geen par, geen lengte, geen SI.
--
-- Fix: uitgaan van alle holes van de bevroren loop-snapshot
-- (`tournament_holes`, zie 20260707112626_tournament_course_snapshot.sql)
-- x alle ronden van het toernooi (`tournaments.rounds`), en LEFT JOIN naar
-- `scores`. Niet-gespeelde holes komen nu mee met par/lengte/SI en
-- strokes/to_par/score_type = NULL. De kolomtypes en -volgorde blijven
-- ongewijzigd t.o.v. de huidige live view, dus CREATE OR REPLACE volstaat
-- (geen DROP nodig).
--
-- Let op: `tp.status <> 'withdrawn'` is bewust NIET naar een enum gecast.
-- Volgens 02-current-state.md is de player_status-enum uit
-- 20260708140000_enum_migration.sql nooit op productie toegepast (tournament_format
-- bleef TEXT+CHECK) — maar de recentere migratie
-- 20260718150000_fix_leaderboard_hole_join.sql gebruikt wel degelijk
-- `'withdrawn'::player_status`. Dat is tegenstrijdig met de documentatie en
-- moet geverifieerd worden via information_schema/pg_type voordat dit wordt
-- toegepast (zie kanttekening in het antwoord aan Jean-Paul). Deze migratie
-- werkt met of zonder enum, omdat er geen expliciete cast gebruikt wordt.

CREATE OR REPLACE VIEW player_hole_scores AS
SELECT
  tp.id                     AS player_id,
  tp.tournament_id,
  rn.round_number,
  h.number                  AS hole_number,
  h.par,
  h.distance_meters,
  h.stroke_index,
  s.strokes,
  (s.strokes - h.par)       AS to_par,
  CASE
    WHEN s.strokes IS NULL THEN NULL
    WHEN s.strokes <= h.par - 2 THEN 'eagle'
    WHEN s.strokes = h.par - 1  THEN 'birdie'
    WHEN s.strokes = h.par      THEN 'par'
    WHEN s.strokes = h.par + 1  THEN 'bogey'
    WHEN s.strokes >= h.par + 2 THEN 'double_bogey'
    ELSE 'unknown'
  END AS score_type
FROM tournament_players tp
JOIN tournaments t
  ON t.id = tp.tournament_id
CROSS JOIN LATERAL generate_series(1, t.rounds) AS rn(round_number)
JOIN tournament_holes h
  ON h.tournament_id = tp.tournament_id
LEFT JOIN scores s
  ON s.player_id = tp.id
 AND s.tournament_id = tp.tournament_id
 AND s.hole_id = h.id
 AND s.round_number = rn.round_number
WHERE tp.status <> 'withdrawn'
ORDER BY tp.id, rn.round_number, h.number;
