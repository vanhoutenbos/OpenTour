-- ============================================================
-- OpenTour — Migratie: Voeg geslacht toe aan tees / teeboxen
--
-- Achtergrond: dezelfde fysieke teebox heeft voor heren en dames
-- een andere course rating en slope rating (WHS-standaard).
-- Door `gender` toe te voegen kan één kleur teebox als twee
-- aparte records worden opgeslagen — één voor heren, één voor
-- dames — elk met hun eigen ratings.
--
-- Toegestane waarden: 'male' | 'female' (of NULL voor
-- onbekend / niet ingevuld).
-- ============================================================

-- ============================================================
-- 1. Bron-tabel: tees
-- ============================================================
ALTER TABLE tees
  ADD COLUMN gender TEXT
    CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN tees.gender IS
  'Geslacht waarvoor deze teebox bedoeld is (male, female). '
  'NULL betekent niet gespecificeerd. Dezelfde kleur teebox kan twee '
  'keer voorkomen — één voor heren en één voor dames — met elk hun '
  'eigen course_rating en slope_rating conform WHS.';

-- ============================================================
-- 2. Snapshot-tabel: tournament_tees
-- Moet spiegelen wat er in `tees` zit zodat het snapshot
-- ook het geslacht bevriest op het moment van activatie.
-- ============================================================
ALTER TABLE tournament_tees
  ADD COLUMN gender TEXT
    CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN tournament_tees.gender IS
  'Bevroren kopie van tees.gender op het moment dat het toernooi werd geactiveerd.';

-- ============================================================
-- 3. Index voor efficiënte queries op gender + course
-- ============================================================
CREATE INDEX idx_tees_gender ON tees(gender);
