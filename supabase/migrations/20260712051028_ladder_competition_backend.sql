-- ============================================================
-- OpenTour — Migratie: Laddercompetitie backend (Fase 0 + Fase 1)
-- ============================================================
-- Zie docs/user-stories/ (nog toe te voegen: 11-ladder-competitie.md) en het
-- gedeelde analyseplan voor de volledige context en de beslissingen die aan
-- dit ontwerp ten grondslag liggen.
--
-- BELANGRIJK — schema-aanname geverifieerd tegen de LIVE database
-- (project ygewcjsrpewwhiqgcmyn) op 2026-07-12: de eerder voorbereide
-- migratie 20260708140000_enum_migration.sql staat wel in de repo, maar
-- staat NIET in de lijst van live toegepaste migraties en `tournaments.format`
-- is in productie nog gewoon TEXT met een CHECK-constraint (geen ENUM). Deze
-- migratie voegt geen nieuwe waarde aan format toe (zie de toelichting bij
-- competition_type hieronder — dat is bewust een apart veld), maar de
-- constraint hieronder (tournaments_ladder_requires_matchplay) verwijst wel
-- naar de bestaande TEXT-waarde 'matchplay', dus dezelfde live-aanname geldt.
--
-- Uitvoering: atomische transactie — alles slaagt of alles rolt terug.
-- ============================================================

BEGIN;

-- ============================================================
-- FASE 0 — Handicapverrekening voor matchplay (gedeeld met gewone
-- matchplay-toernooien, niet alleen de ladder). Handmatig ingevuld per
-- wedstrijd (niet automatisch afgeleid uit een live handicap_index), omdat
-- de handicap van een speler kan wijzigen tussen het moment van indelen en
-- het moment van afslaan. Zie analyseplan §6.
-- ============================================================

ALTER TABLE matchplay_pairings
  ADD COLUMN strokes_given             INT CHECK (strokes_given >= 0),
  ADD COLUMN strokes_receiver_player_id UUID REFERENCES tournament_players(id);

COMMENT ON COLUMN matchplay_pairings.strokes_given IS
  'Aantal slagen dat strokes_receiver_player_id krijgt in deze wedstrijd, handmatig '
  'ingevoerd (eventueel met hulp van een rekenhulp in de UI op basis van de NGF-methode: '
  'verschil in baanhandicap x handicap allowance%%, rekenkundig afgerond). NULL = bruto.';

-- matchplay_pairings had nog geen UPDATE/DELETE policy — nodig om strokes_given
-- achteraf te kunnen invullen/corrigeren en om een verkeerd aangemaakte pairing
-- te kunnen verwijderen. Zelfde organizer-patroon als overal elders.
CREATE POLICY "matchplay_update" ON matchplay_pairings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = matchplay_pairings.tournament_id AND t.created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = matchplay_pairings.tournament_id AND t.created_by = auth.uid())
  );

CREATE POLICY "matchplay_delete" ON matchplay_pairings
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = matchplay_pairings.tournament_id AND t.created_by = auth.uid())
  );

-- Bestaande unique-constraint versoepelen: bij een laddercompetitie die maanden
-- loopt is een herhaalontmoeting tussen dezelfde twee spelers heel normaal
-- (na een positiewissel, of na terug uitdagen op een later moment). Bewuste
-- afweging: dit verwijdert ook de bescherming tegen een dubbele pairing binnen
-- eenzelfde reguliere matchplay-bracket, maar de organisator-UI biedt dat
-- sowieso niet aan als optie, dus het praktische risico is klein.
ALTER TABLE matchplay_pairings
  DROP CONSTRAINT matchplay_pairings_tournament_id_player_a_id_player_b_id_key;

-- ============================================================
-- FASE 1 — Laddercompetitie kernschema
-- ============================================================

-- Format blijft ongewijzigd (strokeplay/stableford/matchplay) — dat veld beschrijft
-- de scoringmechaniek van een ronde/wedstrijd, niet de structuur van het toernooi over
-- tijd. Een ladder bestaat uit losse wedstrijden die zelf gewoon matchplay-gescoord
-- worden; wat een ladder onderscheidt is de structuur eromheen (uitdagen, een
-- lange periode, positiewissels), niet de scoringmethode. Vandaar een apart,
-- orthogonaal veld competition_type i.p.v. 'ladder' aan format toe te voegen —
-- dit houdt ook ruimte voor toekomstige structuurvarianten (bv. een liga-vorm)
-- zonder dat format daarvoor moet blijven groeien. Zie ook hoe 'meerdaags' al
-- los van format bestaat via tournaments.rounds.
ALTER TABLE tournaments
  ADD COLUMN competition_type TEXT NOT NULL DEFAULT 'single'
    CHECK (competition_type IN ('single', 'ladder'));

-- Een ladder-toernooi bestaat uit matchplay-wedstrijden; dit voorkomt de
-- verwarrende combinatie competition_type='ladder' met format='strokeplay'.
ALTER TABLE tournaments
  ADD CONSTRAINT tournaments_ladder_requires_matchplay
    CHECK (competition_type <> 'ladder' OR format = 'matchplay');

COMMENT ON COLUMN tournaments.competition_type IS
  'Structuur van het toernooi over tijd, los van format (scoringmechaniek). '
  '''single'' = regulier eendaags/meerdaags toernooi (huidig gedrag, default). '
  '''ladder'' = laddercompetitie (zie ladder_settings/ladder_positions/ladder_challenges); '
  'vereist format=''matchplay''. Gereserveerd voor een latere fase: ''league''.';

-- ------------------------------------------------------------
-- ladder_settings — instellingen gelden voor de hele ladder (dus voor beide
-- piramides gelijk als er per categorie gesplitst wordt, zie ladder_positions
-- hieronder). Analoog aan hoe generate_flights-instellingen ook gedeeld zijn
-- tussen categorieën.
-- ------------------------------------------------------------
CREATE TABLE ladder_settings (
  tournament_id             UUID PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
  rung_growth               TEXT NOT NULL DEFAULT 'pyramid_double'
                             CHECK (rung_growth IN ('pyramid_double', 'pyramid_linear')),
  top_rung_winner_count     INT NOT NULL DEFAULT 1 CHECK (top_rung_winner_count > 0),
  challenge_scope           TEXT NOT NULL DEFAULT 'rung_above'
                             CHECK (challenge_scope IN ('rung_above', 'n_positions_above')),
  challenge_max_positions   INT CHECK (challenge_max_positions > 0),
  handicap_allowance_pct    INT NOT NULL DEFAULT 100 CHECK (handicap_allowance_pct BETWEEN 0 AND 100),
  response_deadline_days    INT NOT NULL DEFAULT 14 CHECK (response_deadline_days > 0),
  seeding_method            TEXT NOT NULL DEFAULT 'handicap_asc'
                             CHECK (seeding_method IN ('random', 'handicap_asc', 'handicap_desc')),
  split_pyramid_by_category BOOLEAN NOT NULL DEFAULT true,
  self_service_challenges   BOOLEAN NOT NULL DEFAULT false,
  min_matches_per_period    INT NOT NULL DEFAULT 0 CHECK (min_matches_per_period >= 0),
  period_length_days        INT CHECK (period_length_days > 0),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ladder_settings IS
  'Instellingen voor een ladder-toernooi. rung_growth ondersteunt momenteel alleen '
  '''pyramid_double'' in generate_ladder_pyramid(); ''pyramid_linear'' is een '
  'gereserveerde waarde voor een latere fase (zie analyseplan §10).';

-- ------------------------------------------------------------
-- ladder_positions — huidige stand per speler. category_id maakt een aparte
-- piramide per categorie mogelijk (NULL = geen categorie-splitsing). De unieke
-- index gebruikt een vaste sentinel-UUID voor NULL, omdat Postgres NULL <> NULL
-- behandelt in een gewone UNIQUE index (twee NULL-category-rijen zouden anders
-- dezelfde rung/positie kunnen delen).
-- ------------------------------------------------------------
CREATE TABLE ladder_positions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id         UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  tournament_player_id  UUID NOT NULL REFERENCES tournament_players(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES tournament_categories(id) ON DELETE CASCADE,
  rung_number           INT NOT NULL CHECK (rung_number > 0),
  position_in_rung      INT NOT NULL CHECK (position_in_rung > 0),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, tournament_player_id)
);

CREATE UNIQUE INDEX ladder_positions_unique_slot
  ON ladder_positions (
    tournament_id,
    COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
    rung_number,
    position_in_rung
  );

-- ------------------------------------------------------------
-- ladder_challenges — de uitdaging-state-machine.
-- ------------------------------------------------------------
CREATE TYPE public.ladder_challenge_status AS ENUM
  ('pending', 'accepted', 'declined', 'expired', 'completed', 'forfeited');
-- Dit IS een gewone nieuwe ENUM (geen conversie van een bestaande TEXT-kolom),
-- dus dit loopt niet tegen het probleem uit de blokkerende enum-migratie aan.

CREATE TABLE ladder_challenges (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  challenger_player_id   UUID NOT NULL REFERENCES tournament_players(id),
  challenged_player_id   UUID NOT NULL REFERENCES tournament_players(id),
  status                 public.ladder_challenge_status NOT NULL DEFAULT 'pending',
  deadline_at            TIMESTAMPTZ NOT NULL,
  matchplay_pairing_id   UUID REFERENCES matchplay_pairings(id),
  winner_player_id       UUID REFERENCES tournament_players(id),
  result_type            TEXT CHECK (result_type IN ('played', 'forfeit', 'no_show', 'declined')),
  created_by             UUID REFERENCES auth.users,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at            TIMESTAMPTZ,
  CHECK (challenger_player_id <> challenged_player_id)
);

CREATE INDEX idx_ladder_challenges_tournament ON ladder_challenges(tournament_id);
CREATE INDEX idx_ladder_challenges_status ON ladder_challenges(tournament_id, status);
CREATE INDEX idx_ladder_positions_tournament ON ladder_positions(tournament_id);

-- Bewaakt twee regels die niet met een simpele CHECK-constraint zijn te
-- schrijven: (1) uitdager en uitgedaagde moeten in dezelfde piramide zitten,
-- (2) geen van beiden mag al in een openstaande uitdaging zitten. Advisory
-- locks (in vaste volgorde, om deadlocks tussen gelijktijdige inserts te
-- voorkomen) maken de EXISTS-check hieronder race-conditie-vrij; ze worden
-- automatisch vrijgegeven aan het einde van de transactie.
CREATE OR REPLACE FUNCTION check_ladder_challenge_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_category UUID;
  v_challenged_category UUID;
BEGIN
  IF NEW.challenger_player_id::text < NEW.challenged_player_id::text THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.challenger_player_id::text)::bigint);
    PERFORM pg_advisory_xact_lock(hashtext(NEW.challenged_player_id::text)::bigint);
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext(NEW.challenged_player_id::text)::bigint);
    PERFORM pg_advisory_xact_lock(hashtext(NEW.challenger_player_id::text)::bigint);
  END IF;

  SELECT category_id INTO v_challenger_category FROM ladder_positions
    WHERE tournament_id = NEW.tournament_id AND tournament_player_id = NEW.challenger_player_id;
  SELECT category_id INTO v_challenged_category FROM ladder_positions
    WHERE tournament_id = NEW.tournament_id AND tournament_player_id = NEW.challenged_player_id;

  IF v_challenger_category IS DISTINCT FROM v_challenged_category THEN
    RAISE EXCEPTION 'Uitdager en uitgedaagde moeten in dezelfde piramide (categorie) zitten';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ladder_challenges
    WHERE tournament_id = NEW.tournament_id
      AND status IN ('pending', 'accepted')
      AND (challenger_player_id IN (NEW.challenger_player_id, NEW.challenged_player_id)
        OR challenged_player_id IN (NEW.challenger_player_id, NEW.challenged_player_id))
  ) THEN
    RAISE EXCEPTION 'Een van beide spelers zit al in een openstaande uitdaging';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_ladder_challenge_insert
  BEFORE INSERT ON ladder_challenges
  FOR EACH ROW EXECUTE FUNCTION check_ladder_challenge_insert();

-- ------------------------------------------------------------
-- RLS — zelfde organizer/publiek-patroon als flights/tournament_players/
-- matchplay_pairings. Fase 1 = organisator-gedreven, geen speler-self-service
-- (zie analyseplan §4/§8); die uitbreiding komt in een latere migratie.
-- ------------------------------------------------------------

ALTER TABLE ladder_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ladder_settings_select" ON ladder_settings
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_settings.tournament_id
              AND (t.is_public = true OR t.created_by = auth.uid()))
  );
CREATE POLICY "ladder_settings_insert" ON ladder_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_settings.tournament_id AND t.created_by = auth.uid())
  );
CREATE POLICY "ladder_settings_update" ON ladder_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_settings.tournament_id AND t.created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_settings.tournament_id AND t.created_by = auth.uid())
  );
CREATE POLICY "ladder_settings_delete" ON ladder_settings
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_settings.tournament_id AND t.created_by = auth.uid())
  );

CREATE POLICY "ladder_positions_select" ON ladder_positions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_positions.tournament_id
              AND (t.is_public = true OR t.created_by = auth.uid()))
  );
CREATE POLICY "ladder_positions_insert" ON ladder_positions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_positions.tournament_id AND t.created_by = auth.uid())
  );
CREATE POLICY "ladder_positions_update" ON ladder_positions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_positions.tournament_id AND t.created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_positions.tournament_id AND t.created_by = auth.uid())
  );
CREATE POLICY "ladder_positions_delete" ON ladder_positions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_positions.tournament_id AND t.created_by = auth.uid())
  );

CREATE POLICY "ladder_challenges_select" ON ladder_challenges
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_challenges.tournament_id
              AND (t.is_public = true OR t.created_by = auth.uid()))
  );
CREATE POLICY "ladder_challenges_insert" ON ladder_challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_challenges.tournament_id AND t.created_by = auth.uid())
  );
CREATE POLICY "ladder_challenges_update" ON ladder_challenges
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_challenges.tournament_id AND t.created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_challenges.tournament_id AND t.created_by = auth.uid())
  );
CREATE POLICY "ladder_challenges_delete" ON ladder_challenges
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments t
            WHERE t.id = ladder_challenges.tournament_id AND t.created_by = auth.uid())
  );

-- ============================================================
-- generate_ladder_pyramid() — modelleert bewust naar generate_flights():
-- zelfde soort "Genereer"-actie, zelfde sorteeropties-gedachte, zelfde
-- wis-en-herschrijf-patroon. SECURITY INVOKER (default, geen DEFINER) zodat
-- de RLS-policies hierboven gewoon gelden voor wie de functie aanroept —
-- consistent met hoe generate_flights nu ook werkt.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_ladder_pyramid(
  p_tournament_id     UUID,
  p_sort_by           TEXT    DEFAULT 'handicap_asc',
  p_split_by_category BOOLEAN DEFAULT true
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group           RECORD;
  v_settings        RECORD;
  v_player_ids      UUID[];
  v_idx             INT;
  v_rung            INT;
  v_rung_size       INT;
  v_pos             INT;
BEGIN
  IF p_sort_by NOT IN ('random', 'handicap_asc', 'handicap_desc') THEN
    RAISE EXCEPTION 'Ongeldige sorteermethode: %', p_sort_by;
  END IF;

  SELECT * INTO v_settings FROM ladder_settings WHERE tournament_id = p_tournament_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geen ladder_settings gevonden voor toernooi %; maak eerst de instellingen aan', p_tournament_id;
  END IF;
  IF v_settings.rung_growth <> 'pyramid_double' THEN
    RAISE EXCEPTION 'rung_growth ''%'' wordt nog niet ondersteund door generate_ladder_pyramid()', v_settings.rung_growth;
  END IF;

  -- Veiligheid: niet herschrijven zodra er al uitdagingen geaccepteerd of
  -- afgerond zijn — dat zou verdiende posities wissen (zie analyseplan §5.1).
  IF EXISTS (
    SELECT 1 FROM ladder_challenges
    WHERE tournament_id = p_tournament_id AND status IN ('accepted', 'completed')
  ) THEN
    RAISE EXCEPTION 'Kan de piramide niet herschrijven: er zijn al uitdagingen geaccepteerd of afgerond voor dit toernooi';
  END IF;

  IF p_split_by_category AND NOT EXISTS (
    SELECT 1 FROM tournament_categories c WHERE c.tournament_id = p_tournament_id
  ) THEN
    RAISE EXCEPTION 'Er zijn geen categorieen om op te splitsen';
  END IF;

  DELETE FROM ladder_positions WHERE tournament_id = p_tournament_id;

  IF p_split_by_category THEN
    FOR v_group IN
      SELECT c.id AS category_id
      FROM tournament_categories c
      WHERE c.tournament_id = p_tournament_id
      ORDER BY c.sort_order, c.name
    LOOP
      IF p_sort_by = 'random' THEN
        SELECT array_agg(id ORDER BY random()) INTO v_player_ids
        FROM tournament_players
        WHERE tournament_id = p_tournament_id AND status IN ('registered', 'confirmed')
          AND category_id = v_group.category_id;
      ELSIF p_sort_by = 'handicap_desc' THEN
        SELECT array_agg(id ORDER BY handicap DESC NULLS LAST, name) INTO v_player_ids
        FROM tournament_players
        WHERE tournament_id = p_tournament_id AND status IN ('registered', 'confirmed')
          AND category_id = v_group.category_id;
      ELSE
        SELECT array_agg(id ORDER BY handicap ASC NULLS LAST, name) INTO v_player_ids
        FROM tournament_players
        WHERE tournament_id = p_tournament_id AND status IN ('registered', 'confirmed')
          AND category_id = v_group.category_id;
      END IF;

      v_rung := 1;
      v_rung_size := v_settings.top_rung_winner_count;
      v_pos := 1;

      FOR v_idx IN 1 .. COALESCE(array_length(v_player_ids, 1), 0) LOOP
        INSERT INTO ladder_positions
          (tournament_id, tournament_player_id, category_id, rung_number, position_in_rung)
        VALUES
          (p_tournament_id, v_player_ids[v_idx], v_group.category_id, v_rung, v_pos);

        v_pos := v_pos + 1;
        IF v_pos > v_rung_size THEN
          v_rung := v_rung + 1;
          v_rung_size := v_rung_size * 2;
          v_pos := 1;
        END IF;
      END LOOP;
    END LOOP;
  ELSE
    IF p_sort_by = 'random' THEN
      SELECT array_agg(id ORDER BY random()) INTO v_player_ids
      FROM tournament_players
      WHERE tournament_id = p_tournament_id AND status IN ('registered', 'confirmed');
    ELSIF p_sort_by = 'handicap_desc' THEN
      SELECT array_agg(id ORDER BY handicap DESC NULLS LAST, name) INTO v_player_ids
      FROM tournament_players
      WHERE tournament_id = p_tournament_id AND status IN ('registered', 'confirmed');
    ELSE
      SELECT array_agg(id ORDER BY handicap ASC NULLS LAST, name) INTO v_player_ids
      FROM tournament_players
      WHERE tournament_id = p_tournament_id AND status IN ('registered', 'confirmed');
    END IF;

    v_rung := 1;
    v_rung_size := v_settings.top_rung_winner_count;
    v_pos := 1;

    FOR v_idx IN 1 .. COALESCE(array_length(v_player_ids, 1), 0) LOOP
      INSERT INTO ladder_positions
        (tournament_id, tournament_player_id, category_id, rung_number, position_in_rung)
      VALUES
        (p_tournament_id, v_player_ids[v_idx], NULL, v_rung, v_pos);

      v_pos := v_pos + 1;
      IF v_pos > v_rung_size THEN
        v_rung := v_rung + 1;
        v_rung_size := v_rung_size * 2;
        v_pos := 1;
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- ============================================================
-- resolve_ladder_challenge() — legt de uitslag vast en wisselt bij winst van
-- de uitdager de posities. Gebruikt twee tijdelijke "sentinel"-posities
-- (rung_number = 2147483647, position_in_rung 1/2) om de twee UPDATEs zonder
-- transiente schending van de unieke (tournament, categorie, rung, positie)
-- index uit te voeren — een gewone CREATE UNIQUE INDEX wordt namelijk per
-- statement gecontroleerd, niet pas aan het einde van de transactie.
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_ladder_challenge(
  p_challenge_id     UUID,
  p_winner_player_id UUID,
  p_result_type      TEXT DEFAULT 'played'
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_challenge      RECORD;
  v_winner_pos     RECORD;
  v_loser_pos      RECORD;
  v_loser_player_id UUID;
BEGIN
  IF p_result_type NOT IN ('played', 'forfeit', 'no_show', 'declined') THEN
    RAISE EXCEPTION 'Ongeldig result_type: %', p_result_type;
  END IF;

  SELECT * INTO v_challenge FROM ladder_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Uitdaging niet gevonden: %', p_challenge_id;
  END IF;
  IF v_challenge.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Uitdaging is al afgehandeld (status: %)', v_challenge.status;
  END IF;
  IF p_winner_player_id NOT IN (v_challenge.challenger_player_id, v_challenge.challenged_player_id) THEN
    RAISE EXCEPTION 'Winnaar moet de uitdager of de uitgedaagde zijn';
  END IF;

  v_loser_player_id := CASE WHEN p_winner_player_id = v_challenge.challenger_player_id
                             THEN v_challenge.challenged_player_id
                             ELSE v_challenge.challenger_player_id END;

  SELECT * INTO v_winner_pos FROM ladder_positions
    WHERE tournament_id = v_challenge.tournament_id AND tournament_player_id = p_winner_player_id
    FOR UPDATE;
  SELECT * INTO v_loser_pos FROM ladder_positions
    WHERE tournament_id = v_challenge.tournament_id AND tournament_player_id = v_loser_player_id
    FOR UPDATE;

  IF v_winner_pos IS NULL OR v_loser_pos IS NULL THEN
    RAISE EXCEPTION 'Kon de ladderpositie van een van beide spelers niet vinden';
  END IF;

  -- Alleen wisselen als de UITDAGER wint. Wint de verdedigende speler
  -- (challenged_player_id), dan verandert er niets aan de posities.
  IF p_winner_player_id = v_challenge.challenger_player_id THEN
    UPDATE ladder_positions SET rung_number = 2147483647, position_in_rung = 1, updated_at = now()
      WHERE id = v_winner_pos.id;
    UPDATE ladder_positions SET rung_number = 2147483647, position_in_rung = 2, updated_at = now()
      WHERE id = v_loser_pos.id;

    UPDATE ladder_positions SET rung_number = v_loser_pos.rung_number, position_in_rung = v_loser_pos.position_in_rung, updated_at = now()
      WHERE id = v_winner_pos.id;
    UPDATE ladder_positions SET rung_number = v_winner_pos.rung_number, position_in_rung = v_winner_pos.position_in_rung, updated_at = now()
      WHERE id = v_loser_pos.id;
  END IF;

  UPDATE ladder_challenges
  SET status = 'completed',
      winner_player_id = p_winner_player_id,
      result_type = p_result_type,
      resolved_at = now()
  WHERE id = p_challenge_id;
END;
$$;

-- ============================================================
-- ladder_standings — leesbaar overzicht voor de frontend (mirrort het
-- matchplay_standings-patroon: namen/categorie al gejoined, geen aparte
-- client-side joins nodig). Toont ook een eventuele lopende uitdaging
-- waarbij deze speler betrokken is (als challenger of als challenged).
-- ============================================================
CREATE VIEW ladder_standings AS
SELECT
  lp.id                        AS position_id,
  lp.tournament_id,
  lp.tournament_player_id,
  tp.name                      AS player_name,
  tp.handicap,
  tp.status                    AS player_status,
  lp.category_id,
  tc.name                      AS category_name,
  lp.rung_number,
  lp.position_in_rung,
  lp.updated_at,
  lc.id                        AS active_challenge_id,
  lc.status                    AS active_challenge_status,
  lc.deadline_at               AS active_challenge_deadline,
  CASE
    WHEN lc.challenger_player_id = lp.tournament_player_id THEN 'challenger'
    WHEN lc.challenged_player_id = lp.tournament_player_id THEN 'challenged'
  END                          AS active_challenge_role,
  CASE
    WHEN lc.challenger_player_id = lp.tournament_player_id THEN tp_challenged.name
    WHEN lc.challenged_player_id = lp.tournament_player_id THEN tp_challenger.name
  END                          AS active_challenge_opponent_name
FROM ladder_positions lp
JOIN tournament_players tp ON tp.id = lp.tournament_player_id
LEFT JOIN tournament_categories tc ON tc.id = lp.category_id
LEFT JOIN ladder_challenges lc
  ON lc.tournament_id = lp.tournament_id
  AND lc.status IN ('pending', 'accepted')
  AND (lc.challenger_player_id = lp.tournament_player_id OR lc.challenged_player_id = lp.tournament_player_id)
LEFT JOIN tournament_players tp_challenger ON tp_challenger.id = lc.challenger_player_id
LEFT JOIN tournament_players tp_challenged ON tp_challenged.id = lc.challenged_player_id;

COMMIT;
