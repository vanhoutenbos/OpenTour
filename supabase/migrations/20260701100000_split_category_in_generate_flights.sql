-- ============================================================
-- OpenTour — Migratie 014: Flights met gemengde categorieen
-- of gesplitst per categorie, zonder geslachtsfilter.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_flights(
  p_tournament_id          UUID,
  p_start_time             TIMESTAMPTZ,
  p_start_holes            INT[]     DEFAULT ARRAY[1, 10],
  p_interval_minutes       INT       DEFAULT 8,
  p_max_players_per_flight INT       DEFAULT 4,
  p_sort_by                TEXT      DEFAULT 'handicap_asc',
  p_split_by_category      BOOLEAN   DEFAULT TRUE
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group         RECORD;
  v_hole_idx      INT;
  v_hole_count    INT;
  v_flight_id     UUID;
  v_remaining     INT;
  v_counters      INT[];
  v_times         TIMESTAMPTZ[];
  v_flight_name   TEXT;
  v_global_order  INT := 0;
BEGIN
  -- Wis bestaande flights en ontkoppel spelers
  UPDATE tournament_players
  SET flight_id = NULL
  WHERE tournament_id = p_tournament_id;

  DELETE FROM flights
  WHERE tournament_id = p_tournament_id;

  IF p_split_by_category AND NOT EXISTS (
    SELECT 1
    FROM tournament_categories c
    WHERE c.tournament_id = p_tournament_id
  ) THEN
    RAISE EXCEPTION 'Er zijn geen categorieen om op te splitsen';
  END IF;

  v_hole_count := COALESCE(array_length(p_start_holes, 1), 1);
  v_counters := array_fill(0, ARRAY[v_hole_count]);
  v_times := array_fill(p_start_time, ARRAY[v_hole_count]);

  FOR v_group IN
    SELECT c.id AS category_id, c.name AS category_name, c.tee_id
    FROM tournament_categories c
    WHERE c.tournament_id = p_tournament_id
      AND p_split_by_category
    ORDER BY c.sort_order, c.name
  LOOP
    v_hole_idx := 1;

    LOOP
      SELECT COUNT(*) INTO v_remaining
      FROM tournament_players tp
      WHERE tp.tournament_id = p_tournament_id
        AND tp.status IN ('registered', 'confirmed')
        AND tp.flight_id IS NULL
        AND tp.category_id = v_group.category_id;

      EXIT WHEN v_remaining = 0;

      v_counters[v_hole_idx] := v_counters[v_hole_idx] + 1;
      v_global_order := v_global_order + 1;

      IF v_group.category_name IS NOT NULL AND trim(v_group.category_name) <> '' THEN
        v_flight_name := v_group.category_name || ' · ' || p_start_holes[v_hole_idx] || '.' || v_counters[v_hole_idx];
      ELSE
        v_flight_name := 'Flight ' || v_global_order;
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
        v_group.tee_id,
        v_group.category_id,
        p_max_players_per_flight,
        v_global_order
      )
      RETURNING id INTO v_flight_id;

      v_times[v_hole_idx] := v_times[v_hole_idx]
        + (p_interval_minutes || ' minutes')::interval;

      IF p_sort_by = 'random' THEN
        UPDATE tournament_players
        SET flight_id = v_flight_id
        WHERE id IN (
          SELECT id
          FROM tournament_players
          WHERE tournament_id = p_tournament_id
            AND category_id = v_group.category_id
            AND status IN ('registered', 'confirmed')
            AND flight_id IS NULL
          ORDER BY random()
          LIMIT p_max_players_per_flight
        );
      ELSE
        UPDATE tournament_players
        SET flight_id = v_flight_id
        WHERE id IN (
          SELECT id
          FROM tournament_players
          WHERE tournament_id = p_tournament_id
            AND category_id = v_group.category_id
            AND status IN ('registered', 'confirmed')
            AND flight_id IS NULL
          ORDER BY handicap ASC NULLS LAST, name
          LIMIT p_max_players_per_flight
        );
      END IF;

      v_hole_idx := (v_hole_idx % v_hole_count) + 1;
    END LOOP;
  END LOOP;

  IF NOT p_split_by_category THEN
    v_hole_idx := 1;

    LOOP
      SELECT COUNT(*) INTO v_remaining
      FROM tournament_players tp
      WHERE tp.tournament_id = p_tournament_id
        AND tp.status IN ('registered', 'confirmed')
        AND tp.flight_id IS NULL;

      EXIT WHEN v_remaining = 0;

      v_counters[v_hole_idx] := v_counters[v_hole_idx] + 1;
      v_global_order := v_global_order + 1;
      v_flight_name := 'Flight ' || v_global_order;

      INSERT INTO flights (
        tournament_id, name, start_time,
        tee_number, tee_id, category_id, max_players, sort_order
      )
      VALUES (
        p_tournament_id,
        v_flight_name,
        v_times[v_hole_idx],
        p_start_holes[v_hole_idx],
        NULL,
        NULL,
        p_max_players_per_flight,
        v_global_order
      )
      RETURNING id INTO v_flight_id;

      v_times[v_hole_idx] := v_times[v_hole_idx]
        + (p_interval_minutes || ' minutes')::interval;

      IF p_sort_by = 'random' THEN
        UPDATE tournament_players
        SET flight_id = v_flight_id
        WHERE id IN (
          SELECT id
          FROM tournament_players
          WHERE tournament_id = p_tournament_id
            AND status IN ('registered', 'confirmed')
            AND flight_id IS NULL
          ORDER BY random()
          LIMIT p_max_players_per_flight
        );
      ELSE
        UPDATE tournament_players
        SET flight_id = v_flight_id
        WHERE id IN (
          SELECT id
          FROM tournament_players
          WHERE tournament_id = p_tournament_id
            AND status IN ('registered', 'confirmed')
            AND flight_id IS NULL
          ORDER BY handicap ASC NULLS LAST, name
          LIMIT p_max_players_per_flight
        );
      END IF;

      v_hole_idx := (v_hole_idx % v_hole_count) + 1;
    END LOOP;
  END IF;
END;
$$;
