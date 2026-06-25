-- ============================================================
-- OpenTour — Migratie 010: Voeg sorteer- en geslachtsopties
-- toe aan generate_flights functie.
-- ============================================================

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

        INSERT INTO flights (
          tournament_id, name, start_time,
          tee_number, tee_id, category_id, max_players
        )
        VALUES (
          p_tournament_id,
          v_category.name || ' · ' || p_start_holes[v_hole_idx] || '.' || v_counters[v_hole_idx],
          v_times[v_hole_idx],
          p_start_holes[v_hole_idx],
          v_category.tee_id,
          v_category.id,
          p_max_players_per_flight
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
