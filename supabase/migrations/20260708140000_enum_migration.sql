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
  CREATE TYPE public.app_language AS ENUM ('nl', 'en');
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

  -- profiles.language → language (quote column name - 'language' is reserved word)
    SELECT COUNT(*) INTO v_count FROM profiles
      WHERE "language" IS NOT NULL AND "language" NOT IN ('nl', 'en');
    IF v_count > 0 THEN
      SELECT string_agg('id=' || id::text || ' language=' || "language", ', ') INTO v_detail
        FROM profiles WHERE "language" IS NOT NULL AND "language" NOT IN ('nl', 'en');
      RAISE EXCEPTION 'Ongeldige waarden in profiles.language: %', v_detail;
  END IF;

END $$;

-- ============================================================
-- STAP 2.5: Bestaande DEFAULTs veiligstellen
-- Postgres kan de kolom-DEFAULT niet automatisch casten naar een
-- nieuw ENUM-type (er is geen impliciete cast text → enum). Als een
-- kolom een DEFAULT heeft, faalt de ALTER COLUMN … TYPE hieronder
-- met "default for column ... cannot be cast automatically".
--
-- Oplossing: voor alle 12 kolommen dynamisch de huidige DEFAULT-
-- expressie opzoeken (via pg_attrdef), opslaan in een temp-tabel,
-- en de DEFAULT droppen. Kolommen zonder DEFAULT worden overgeslagen.
-- In STAP 3.5 wordt de DEFAULT teruggezet met een expliciete cast
-- naar het bijbehorende ENUM-type.
-- ============================================================

CREATE TEMP TABLE _enum_migration_defaults (
  tbl          text,
  col          text,
  enum_type    text,
  default_expr text
) ON COMMIT DROP;

DO $$
DECLARE
  rec RECORD;
  v_default TEXT;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
      ('profiles',             'language',   'app_language'),
    ('profiles',             'role',       'user_role'),
    ('courses',               'source',     'course_source'),
    ('loops',                 'loop_type',  'loop_type'),
    ('tees',                  'gender',     'gender_binary'),
    ('tournaments',           'format',     'tournament_format'),
    ('tournaments',           'scoring_type','scoring_type'),
    ('tournaments',           'status',     'tournament_status'),
    ('tournament_players',    'status',     'player_status'),
    ('tournament_players',    'gender',     'gender_binary'),
    ('tournament_categories', 'gender',     'gender_category'),
    ('tournament_tees',       'gender',     'gender_category')
  ) AS t(tbl, col, enum_type)
  LOOP
    SELECT pg_get_expr(d.adbin, d.adrelid)
      INTO v_default
    FROM pg_attrdef d
    JOIN pg_attribute a
      ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE d.adrelid = ('public.' || rec.tbl)::regclass
      AND a.attname = rec.col;

    IF v_default IS NOT NULL THEN
      INSERT INTO _enum_migration_defaults(tbl, col, enum_type, default_expr)
      VALUES (rec.tbl, rec.col, rec.enum_type, v_default);

      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', rec.tbl, rec.col);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STAP 2.6: Verwijder views en policies die afhankelijk zijn van de kolommen
-- ------------------------------------------------------------
-- FIX (2026-07-10), gevonden tijdens dry-run testen: Postgres
-- weigert ALTER COLUMN ... TYPE zolang een view er nog van afhangt
-- ("cannot alter type of a column used by a view or rule"). Live
-- dependency-check (pg_depend) wijst twee views aan:
--   - tournament_leaderboard  → tournaments.format, tournaments.scoring_type,
--     tournament_players.status
--   - player_hole_scores      → tournament_players.status
-- Beide worden hieronder verwijderd en in STAP 3.6 exact
-- teruggezet met hun huidige, live definitie (opgehaald via
-- pg_views, niet uit een migratiebestand — zie de aantekening
-- in CLAUDE.md over drift tussen migraties en live schema).
-- matchplay_standings en course_hole_stats zijn gecontroleerd en
-- hangen niet af van de geconverteerde kolommen — geen actie nodig.
--
-- Zelfde verhaal voor RLS-policies: Postgres weigert ALTER COLUMN
-- TYPE ook als een policy-expressie (pg_policies.qual/with_check)
-- de kolom gebruikt ("cannot alter type of a column used in a
-- policy definition"). Live check tegen pg_policies wijst één
-- policy aan: tournaments_select_public (gebruikt tournaments.status).
-- Wordt hieronder gedropt en in STAP 3.5 teruggezet.
--
-- Derde categorie, ook tijdens dry-run gevonden: de trigger
-- trg_freeze_tournament_course_snapshot heeft een WHEN-clausule
-- die tournaments.status vergelijkt ("cannot alter type of a
-- column used in a trigger definition"). Ook deze moet weg vóór
-- STAP 3 en wordt na STAP 4 teruggezet met de kolomtype-cast
-- geüpdatet naar het nieuwe ENUM-type.
-- ============================================================

DROP VIEW IF EXISTS tournament_leaderboard;
DROP VIEW IF EXISTS player_hole_scores;
DROP POLICY IF EXISTS "tournaments_select_public" ON tournaments;
DROP TRIGGER IF EXISTS trg_freeze_tournament_course_snapshot ON tournaments;

-- ============================================================
-- STAP 2.7: Verwijder CHECK constraints VÓÓR de type-conversie
-- ------------------------------------------------------------
-- FIX (2026-07-10): dit stond eerder ná STAP 3 als "STAP 4", wat
-- faalt met "operator does not exist: <enum> = text". Oorzaak:
-- ALTER COLUMN ... TYPE hervalideert elke nog-aanwezige CHECK
-- constraint tegen het NIEUWE kolomtype. De constraint-body is
-- intern al opgeslagen met een expliciete ::text cast op de
-- literals (bijv. CHECK (language = ANY (ARRAY['nl'::text,
-- 'en'::text]))), dus Postgres heeft een <enum> = text operator
-- nodig — die bestaat niet voor een net aangemaakt ENUM-type.
-- De constraints moeten daarom weg vóórdat de kolom van type
-- verandert, niet erna. De ENUM-types dwingen vanaf STAP 3
-- dezelfde domeinintegriteit af, dus dit is functioneel gelijk.
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
-- STAP 3: Kolommen converteren van TEXT naar ENUM
-- Volgorde: eerst de kleinere tabellen, dan tournaments (meest gebruikte).
-- De USING-cast converteert bestaande TEXT-waarden naar ENUM.
-- NULL-waarden blijven NULL (USING cast behoudt NULL automatisch).
-- ============================================================

ALTER TABLE profiles
  ALTER COLUMN "language" TYPE public.app_language USING "language"::public.app_language,
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
-- STAP 3.5: Views herstellen (exacte live definitie, opgehaald
-- vóór deze migratie via `SELECT definition FROM pg_views`)
-- ============================================================

CREATE VIEW player_hole_scores AS
 SELECT tp.id AS player_id,
    tp.tournament_id,
    s.round_number,
    h.number AS hole_number,
    h.par,
    h.distance_meters,
    h.stroke_index,
    s.strokes,
    (s.strokes - h.par) AS to_par,
        CASE
            WHEN (s.strokes <= (h.par - 2)) THEN 'eagle'::text
            WHEN (s.strokes = (h.par - 1)) THEN 'birdie'::text
            WHEN (s.strokes = h.par) THEN 'par'::text
            WHEN (s.strokes = (h.par + 1)) THEN 'bogey'::text
            WHEN (s.strokes >= (h.par + 2)) THEN 'double_bogey'::text
            ELSE 'unknown'::text
        END AS score_type
   FROM ((tournament_players tp
     JOIN scores s ON (((s.player_id = tp.id) AND (s.tournament_id = tp.tournament_id))))
     JOIN tournament_holes h ON ((s.hole_id = h.id)))
  WHERE (tp.status <> 'withdrawn'::public.player_status)
  ORDER BY tp.id, s.round_number, h.number;

CREATE VIEW tournament_leaderboard AS
 WITH scored AS (
         SELECT tp.id AS player_id,
            tp.name AS player_name,
            tp.handicap,
            tp.status AS player_status,
            f.name AS flight_name,
            f.sort_order AS flight_sort_order,
            f.tee_number AS started_on_hole,
            t.id AS tournament_id,
            t.name AS tournament_name,
            t.format,
            t.scoring_type,
            s.round_number,
            s.strokes,
            h.par,
            h.stroke_index,
            (s.strokes - h.par) AS hole_to_par,
            (s.strokes -
                CASE
                    WHEN (h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer) THEN 1
                    ELSE 0
                END) AS net_strokes,
                CASE
                    WHEN (s.strokes <= (h.par - 2)) THEN 4
                    WHEN (s.strokes = (h.par - 1)) THEN 3
                    WHEN (s.strokes = h.par) THEN 2
                    WHEN (s.strokes = (h.par + 1)) THEN 1
                    ELSE 0
                END AS gross_stableford,
                CASE
                    WHEN ((s.strokes -
                    CASE
                        WHEN (h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer) THEN 1
                        ELSE 0
                    END) <= (h.par - 2)) THEN 4
                    WHEN ((s.strokes -
                    CASE
                        WHEN (h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer) THEN 1
                        ELSE 0
                    END) = (h.par - 1)) THEN 3
                    WHEN ((s.strokes -
                    CASE
                        WHEN (h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer) THEN 1
                        ELSE 0
                    END) = h.par) THEN 2
                    WHEN ((s.strokes -
                    CASE
                        WHEN (h.stroke_index <= (round(COALESCE(tp.handicap, (0)::double precision)))::integer) THEN 1
                        ELSE 0
                    END) = (h.par + 1)) THEN 1
                    ELSE 0
                END AS net_stableford,
            max(s.round_number) OVER (PARTITION BY tp.id) AS max_round
           FROM ((((tournament_players tp
             JOIN tournaments t ON ((tp.tournament_id = t.id)))
             LEFT JOIN flights f ON ((tp.flight_id = f.id)))
             LEFT JOIN scores s ON (((s.player_id = tp.id) AND (s.tournament_id = t.id))))
             LEFT JOIN holes h ON ((s.hole_id = h.id)))
          WHERE (tp.status <> 'withdrawn'::public.player_status)
        ), aggregated AS (
         SELECT scored.player_id,
            scored.player_name,
            scored.handicap,
            scored.player_status,
            scored.flight_name,
            scored.flight_sort_order,
            scored.started_on_hole,
            scored.tournament_id,
            scored.tournament_name,
            scored.format,
            scored.scoring_type,
            count(scored.strokes) AS holes_played,
            sum(scored.strokes) AS total_strokes,
            (sum(scored.strokes) - sum(scored.par)) AS score_to_par,
            sum(scored.net_strokes) AS total_net_strokes,
            (sum(scored.net_strokes) - sum(scored.par)) AS net_score_to_par,
            sum(scored.gross_stableford) AS gross_stableford_points,
            sum(scored.net_stableford) AS net_stableford_points,
            max(scored.max_round) AS max_round
           FROM scored
          GROUP BY scored.player_id, scored.player_name, scored.handicap, scored.player_status, scored.flight_name, scored.flight_sort_order, scored.started_on_hole, scored.tournament_id, scored.tournament_name, scored.format, scored.scoring_type
        ), round_totals AS (
         SELECT scored.player_id,
            scored.tournament_id,
            scored.round_number,
            sum(scored.strokes) AS round_strokes,
            sum(scored.hole_to_par) AS round_to_par
           FROM scored
          WHERE (scored.round_number IS NOT NULL)
          GROUP BY scored.player_id, scored.tournament_id, scored.round_number
        ), player_rounds AS (
         SELECT round_totals.player_id,
            round_totals.tournament_id,
            json_agg(json_build_object('round', round_totals.round_number, 'strokes', round_totals.round_strokes, 'to_par', round_totals.round_to_par) ORDER BY round_totals.round_number) AS round_data
           FROM round_totals
          GROUP BY round_totals.player_id, round_totals.tournament_id
        )
 SELECT a.player_id,
    a.player_name,
    a.handicap,
    a.player_status,
    a.flight_name,
    a.flight_sort_order,
    COALESCE(a.started_on_hole, 1) AS started_on_hole,
    a.tournament_id,
    a.tournament_name,
    a.format,
    a.scoring_type,
    a.holes_played,
    a.total_strokes,
    a.score_to_par,
    a.total_net_strokes,
    a.net_score_to_par,
    a.gross_stableford_points,
    a.net_stableford_points,
    COALESCE(( SELECT count(*) AS count
           FROM jsonb_array_elements((pr.round_data)::jsonb) r(value)
          WHERE ((((r.value ->> 'round'::text))::integer = a.max_round) AND ((r.value ->> 'strokes'::text) IS NOT NULL))), (0)::bigint) AS today_holes,
    ( SELECT ((r.value ->> 'to_par'::text))::integer AS int4
           FROM jsonb_array_elements((pr.round_data)::jsonb) r(value)
          WHERE (((r.value ->> 'round'::text))::integer = a.max_round)) AS today_score,
    ( SELECT array_agg(((r.value ->> 'strokes'::text))::integer ORDER BY ((r.value ->> 'round'::text))::integer) AS array_agg
           FROM jsonb_array_elements((pr.round_data)::jsonb) r(value)) AS round_scores,
    ( SELECT array_agg(((r.value ->> 'to_par'::text))::integer ORDER BY ((r.value ->> 'round'::text))::integer) AS array_agg
           FROM jsonb_array_elements((pr.round_data)::jsonb) r(value)) AS round_to_par,
    row_number() OVER (PARTITION BY a.tournament_id ORDER BY
        CASE
            WHEN (a.player_status = ANY (ARRAY['dns'::public.player_status, 'dnf'::public.player_status, 'dsq'::public.player_status])) THEN 1
            ELSE 0
        END,
        CASE
            WHEN ((a.format = 'stableford'::public.tournament_format) AND (a.scoring_type = 'net'::public.scoring_type)) THEN (- a.net_stableford_points)
            WHEN ((a.format = 'stableford'::public.tournament_format) AND (a.scoring_type = 'gross'::public.scoring_type)) THEN (- a.gross_stableford_points)
            WHEN ((a.format = 'strokeplay'::public.tournament_format) AND (a.scoring_type = 'net'::public.scoring_type)) THEN a.total_net_strokes
            ELSE a.total_strokes
        END, a.holes_played DESC) AS "position"
   FROM (aggregated a
     LEFT JOIN player_rounds pr ON (((pr.player_id = a.player_id) AND (pr.tournament_id = a.tournament_id))))
  ORDER BY (row_number() OVER (PARTITION BY a.tournament_id ORDER BY
        CASE
            WHEN (a.player_status = ANY (ARRAY['dns'::public.player_status, 'dnf'::public.player_status, 'dsq'::public.player_status])) THEN 1
            ELSE 0
        END,
        CASE
            WHEN ((a.format = 'stableford'::public.tournament_format) AND (a.scoring_type = 'net'::public.scoring_type)) THEN (- a.net_stableford_points)
            WHEN ((a.format = 'stableford'::public.tournament_format) AND (a.scoring_type = 'gross'::public.scoring_type)) THEN (- a.gross_stableford_points)
            WHEN ((a.format = 'strokeplay'::public.tournament_format) AND (a.scoring_type = 'net'::public.scoring_type)) THEN a.total_net_strokes
            ELSE a.total_strokes
        END, a.holes_played DESC));

-- ============================================================
-- STAP 3.55: RLS-policy herstellen
-- ============================================================

CREATE POLICY "tournaments_select_public" ON tournaments
  FOR SELECT USING ((is_public = true) AND (status <> 'draft'::public.tournament_status));

-- ============================================================
-- STAP 3.6: Opgeslagen DEFAULTs terugzetten
-- Zet elke eerder opgeslagen DEFAULT terug, nu expliciet gecast
-- naar het nieuwe ENUM-type. De default_expr ziet er doorgaans uit
-- als  'nl'::text  — we knippen alles vóór de eerste '::' cast af
-- (de literal zelf, inclusief quotes) en casten die naar het ENUM.
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  v_literal TEXT;
BEGIN
  FOR rec IN SELECT * FROM _enum_migration_defaults LOOP
    v_literal := split_part(rec.default_expr, '::', 1);
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s::public.%I',
      rec.tbl, rec.col, v_literal, rec.enum_type
    );
  END LOOP;
END $$;

-- ============================================================
-- STAP 4: Update trigger-functie freeze_tournament_course_snapshot
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
-- STAP 4.5: Trigger herstellen (WHEN-clausule nu tegen het ENUM-type)
-- ============================================================

CREATE TRIGGER trg_freeze_tournament_course_snapshot
  AFTER UPDATE OF status ON public.tournaments
  FOR EACH ROW
  WHEN ((OLD.status = 'draft'::public.tournament_status) AND (NEW.status = 'active'::public.tournament_status))
  EXECUTE FUNCTION freeze_tournament_course_snapshot();

-- ============================================================
-- STAP 5: Uitbreidbaarheid
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