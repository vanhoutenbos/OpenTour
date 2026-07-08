-- ============================================================
-- OpenTour — Migratie: TEXT → ENUM voor alle geconstrained kolommen
-- ============================================================
-- Doel: Vervangt alle TEXT + CHECK constraint kolommen door native
--       PostgreSQL ENUM types voor betere domeinintegriteit en
--       automatische Supabase type-generatie.
--
-- Uitvoering: atomische transactie — alles slaagt of alles rolt terug.
-- ============================================================

BEGIN;

-- ============================================================
-- STAP 1: ENUM-types aanmaken
-- Gebruik duplicate_object guard zodat heruitvoering geen fout geeft.
-- PostgreSQL 15 ondersteunt geen CREATE TYPE … IF NOT EXISTS,
-- vandaar de DO $$ … EXCEPTION WHEN duplicate_object … $$ aanpak.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.tournament_format AS ENUM ('strokeplay', 'stableford', 'matchplay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scoring_type AS ENUM ('gross', 'net');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tournament_status AS ENUM ('draft', 'active', 'paused', 'finished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.player_status AS ENUM ('registered', 'confirmed', 'withdrawn', 'dns', 'dnf', 'dsq');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gender_binary AS ENUM ('male', 'female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gender_category AS ENUM ('male', 'female', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.loop_type AS ENUM ('full_18', 'front_9', 'back_9', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('organizer', 'recorder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.course_source AS ENUM ('egolf4u', 'custom', 'community');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.language AS ENUM ('nl', 'en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- STAP 2: Pre-flight validatie
-- Controleer alle 12 kolommen op ongeldige waarden VÓÓR enige
-- ALTER COLUMN. Bij een treffer wordt de transactie afgebroken
-- met tabelnaam, rij-id's en de ongeldige waarden.
-- ============================================================

DO $$
DECLARE
  v_count   INT;
  v_detail  TEXT;
BEGIN
  -- tees.gender → gender_binary ('male', 'female')
  SELECT COUNT(*) INTO v_count FROM tees
    WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' gender=' || gender, ', ') INTO v_detail
      FROM tees WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');
    RAISE EXCEPTION 'Ongeldige waarden in tees.gender: %', v_detail;
  END IF;

  -- tournament_players.gender → gender_binary ('male', 'female')
  SELECT COUNT(*) INTO v_count FROM tournament_players
    WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' gender=' || gender, ', ') INTO v_detail
      FROM tournament_players WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');
    RAISE EXCEPTION 'Ongeldige waarden in tournament_players.gender: %', v_detail;
  END IF;

  -- tournament_categories.gender → gender_category ('male', 'female', 'mixed')
  SELECT COUNT(*) INTO v_count FROM tournament_categories
    WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female', 'mixed');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' gender=' || gender, ', ') INTO v_detail
      FROM tournament_categories WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female', 'mixed');
    RAISE EXCEPTION 'Ongeldige waarden in tournament_categories.gender: %', v_detail;
  END IF;

  -- tournament_tees.gender → gender_category ('male', 'female', 'mixed')
  SELECT COUNT(*) INTO v_count FROM tournament_tees
    WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female', 'mixed');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' gender=' || gender, ', ') INTO v_detail
      FROM tournament_tees WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female', 'mixed');
    RAISE EXCEPTION 'Ongeldige waarden in tournament_tees.gender: %', v_detail;
  END IF;

  -- tournaments.format → tournament_format
  SELECT COUNT(*) INTO v_count FROM tournaments
    WHERE format IS NOT NULL AND format NOT IN ('strokeplay', 'stableford', 'matchplay');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' format=' || format, ', ') INTO v_detail
      FROM tournaments WHERE format IS NOT NULL AND format NOT IN ('strokeplay', 'stableford', 'matchplay');
    RAISE EXCEPTION 'Ongeldige waarden in tournaments.format: %', v_detail;
  END IF;

  -- tournaments.scoring_type → scoring_type
  SELECT COUNT(*) INTO v_count FROM tournaments
    WHERE scoring_type IS NOT NULL AND scoring_type NOT IN ('gross', 'net');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' scoring_type=' || scoring_type, ', ') INTO v_detail
      FROM tournaments WHERE scoring_type IS NOT NULL AND scoring_type NOT IN ('gross', 'net');
    RAISE EXCEPTION 'Ongeldige waarden in tournaments.scoring_type: %', v_detail;
  END IF;

  -- tournaments.status → tournament_status
  SELECT COUNT(*) INTO v_count FROM tournaments
    WHERE status IS NOT NULL AND status NOT IN ('draft', 'active', 'paused', 'finished');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' status=' || status, ', ') INTO v_detail
      FROM tournaments WHERE status IS NOT NULL AND status NOT IN ('draft', 'active', 'paused', 'finished');
    RAISE EXCEPTION 'Ongeldige waarden in tournaments.status: %', v_detail;
  END IF;

  -- tournament_players.status → player_status
  SELECT COUNT(*) INTO v_count FROM tournament_players
    WHERE status IS NOT NULL AND status NOT IN ('registered', 'confirmed', 'withdrawn', 'dns', 'dnf', 'dsq');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' status=' || status, ', ') INTO v_detail
      FROM tournament_players WHERE status IS NOT NULL AND status NOT IN ('registered', 'confirmed', 'withdrawn', 'dns', 'dnf', 'dsq');
    RAISE EXCEPTION 'Ongeldige waarden in tournament_players.status: %', v_detail;
  END IF;

  -- loops.loop_type → loop_type
  SELECT COUNT(*) INTO v_count FROM loops
    WHERE loop_type IS NOT NULL AND loop_type NOT IN ('full_18', 'front_9', 'back_9', 'custom');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' loop_type=' || loop_type, ', ') INTO v_detail
      FROM loops WHERE loop_type IS NOT NULL AND loop_type NOT IN ('full_18', 'front_9', 'back_9', 'custom');
    RAISE EXCEPTION 'Ongeldige waarden in loops.loop_type: %', v_detail;
  END IF;

  -- profiles.role → user_role
  SELECT COUNT(*) INTO v_count FROM profiles
    WHERE role IS NOT NULL AND role NOT IN ('organizer', 'recorder');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' role=' || role, ', ') INTO v_detail
      FROM profiles WHERE role IS NOT NULL AND role NOT IN ('organizer', 'recorder');
    RAISE EXCEPTION 'Ongeldige waarden in profiles.role: %', v_detail;
  END IF;

  -- courses.source → course_source
  SELECT COUNT(*) INTO v_count FROM courses
    WHERE source IS NOT NULL AND source NOT IN ('egolf4u', 'custom', 'community');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' source=' || source, ', ') INTO v_detail
      FROM courses WHERE source IS NOT NULL AND source NOT IN ('egolf4u', 'custom', 'community');
    RAISE EXCEPTION 'Ongeldige waarden in courses.source: %', v_detail;
  END IF;

  -- profiles.language → language
  SELECT COUNT(*) INTO v_count FROM profiles
    WHERE language IS NOT NULL AND language NOT IN ('nl', 'en');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id::text || ' language=' || language, ', ') INTO v_detail
      FROM profiles WHERE language IS NOT NULL AND language NOT IN ('nl', 'en');
    RAISE EXCEPTION 'Ongeldige waarden in profiles.language: %', v_detail;
  END IF;

END $$;

-- ============================================================
-- STAP 3: Kolommen converteren van TEXT naar ENUM
-- Volgorde: eerst de kleinere tabellen, dan tournaments (meest gebruikte).
-- De USING-cast converteert bestaande TEXT-waarden naar ENUM.
-- NULL-waarden blijven NULL (USING cast behoudt NULL automatisch).
-- ============================================================

ALTER TABLE profiles
  ALTER COLUMN language    TYPE public.language    USING language::public.language,
  ALTER COLUMN role        TYPE public.user_role   USING role::public.user_role;

ALTER TABLE courses
  ALTER COLUMN source      TYPE public.course_source USING source::public.course_source;

ALTER TABLE loops
  ALTER COLUMN loop_type   TYPE public.loop_type   USING loop_type::public.loop_type;

ALTER TABLE tees
  ALTER COLUMN gender      TYPE public.gender_binary USING gender::public.gender_binary;

ALTER TABLE tournaments
  ALTER COLUMN format      TYPE public.tournament_format  USING format::public.tournament_format,
  ALTER COLUMN scoring_type TYPE public.scoring_type      USING scoring_type::public.scoring_type,
  ALTER COLUMN status      TYPE public.tournament_status  USING status::public.tournament_status;

ALTER TABLE tournament_players
  ALTER COLUMN status      TYPE public.player_status  USING status::public.player_status,
  ALTER COLUMN gender      TYPE public.gender_binary  USING gender::public.gender_binary;

ALTER TABLE tournament_categories
  ALTER COLUMN gender      TYPE public.gender_category USING gender::public.gender_category;

ALTER TABLE tournament_tees
  ALTER COLUMN gender      TYPE public.gender_category USING gender::public.gender_category;

-- ============================================================
-- STAP 4: Verwijder redundante CHECK constraints
-- De ENUM-types dwingen nu domeinintegriteit af.
-- CHECK constraints zijn redundant geworden en worden verwijderd.
-- IF EXISTS zorgt voor idempotentie bij heruitvoering.
-- NB: tournament_players.gender had geen CHECK constraint — geen DROP nodig.
-- ============================================================

ALTER TABLE profiles              DROP CONSTRAINT IF EXISTS profiles_language_check;
ALTER TABLE profiles              DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE courses               DROP CONSTRAINT IF EXISTS courses_source_check;
ALTER TABLE tournaments           DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments           DROP CONSTRAINT IF EXISTS tournaments_scoring_type_check;
ALTER TABLE tournaments           DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE tournament_players    DROP CONSTRAINT IF EXISTS tournament_players_status_check;
ALTER TABLE tournament_categories DROP CONSTRAINT IF EXISTS tournament_categories_gender_check;
ALTER TABLE tournament_tees       DROP CONSTRAINT IF EXISTS tournament_tees_gender_check;
ALTER TABLE tees                  DROP CONSTRAINT IF EXISTS tees_gender_check;
ALTER TABLE loops                 DROP CONSTRAINT IF EXISTS loops_loop_type_check;

-- ============================================================
-- STAP 5: Update trigger-functie freeze_tournament_course_snapshot
-- Voeg gender-kopieerlogica toe: tees.gender (gender_binary)
-- wordt gekopieerd naar tournament_tees.gender (gender_category).
-- Directe ENUM→ENUM cast is niet mogelijk in PostgreSQL;
-- gebruik de dubbele cast ::text::public.gender_category.
-- ============================================================

CREATE OR REPLACE FUNCTION freeze_tournament_course_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournament_holes WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
    SELECT NEW.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters
    FROM holes h WHERE h.course_id = NEW.course_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tournament_tees WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating, gender)
    SELECT NEW.id, te.id, te.name, te.color, te.slope_rating, te.course_rating,
           te.gender::text::public.gender_category
    FROM tees te WHERE te.course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- ============================================================
-- STAP 6: Uitbreidbaarheid
-- ============================================================
--
-- ENUM-waarden toevoegen:
--   ALTER TYPE public.<type_name> ADD VALUE '<nieuwe_waarde>';
--
-- Voorbeeld: een nieuw toernooiformat 'scramble' toevoegen:
--   ALTER TYPE public.tournament_format ADD VALUE 'scramble';
--
-- Na ADD VALUE: hergeneer database.types.ts via:
--   supabase gen types typescript --project-id <id>
-- en update packages/types/src/index.ts handmatig.
--
-- ENUM-waarden verwijderen of hernoemen (drie stappen):
--   1. Nieuw ENUM-type aanmaken met de gewenste waarden:
--      CREATE TYPE public.<type_name>_new AS ENUM (...);
--   2. Kolom converteren naar het nieuwe type:
--      ALTER TABLE <tabel> ALTER COLUMN <kolom>
--        TYPE public.<type_name>_new
--        USING <kolom>::text::public.<type_name>_new;
--   3. Oud ENUM-type verwijderen:
--      DROP TYPE public.<type_name>;
--   4. Optioneel: hernoem het nieuwe type:
--      ALTER TYPE public.<type_name>_new RENAME TO public.<type_name>;
-- ============================================================

COMMIT;
