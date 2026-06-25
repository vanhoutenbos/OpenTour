-- ============================================================
-- OpenTour — Migratie 009: Fix generate_flights functie
-- Probleem: subquery voor flightnaam en starttijd was niet
-- deterministisch; vervangen door lokale tellers per starthole.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_flights(
  p_tournament_id        UUID,
  p_start_time           TIMESTAMPTZ,
  p_start_holes          INT[]    DEFAULT ARRAY[1, 10],
  p_interval_minutes     INT      DEFAULT 8,
  p_max_players_per_flight INT    DEFAULT 4
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category      RECORD;
  v_hole_idx      INT;
  v_hole_count    INT;
  v_flight_id     UUID;
  v_remaining     INT;
  -- Per starthole een eigen teller en tijdstip
  v_counters      INT[];
  v_times         TIMESTAMPTZ[];
  v_idx           INT;
BEGIN
  -- Wis bestaande flights en ontkoppel spelers
  UPDATE tournament_players SET flight_id = NULL
  WHERE tournament_id = p_tournament_id;

  DELETE FROM flights WHERE tournament_id = p_tournament_id;

  v_hole_count := coalesce(array_length(p_start_holes, 1), 1);

  -- Initialiseer tellers en starttijden per hole
  v_counters := array_fill(0, ARRAY[v_hole_count]);
  v_times    := array_fill(p_start_time, ARRAY[v_hole_count]);

  FOR v_category IN
    SELECT c.id, c.name, c.tee_id
    FROM tournament_categories c
    WHERE c.tournament_id = p_tournament_id
    ORDER BY c.sort_order, c.name
  LOOP
    -- Round-robin over startholes per categorie
    v_hole_idx := 1;

    LOOP
      SELECT COUNT(*) INTO v_remaining
      FROM tournament_players tp
      WHERE tp.tournament_id = p_tournament_id
        AND tp.category_id = v_category.id
        AND tp.status IN ('registered', 'confirmed')
        AND tp.flight_id IS NULL;

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

      -- Volgende flight op dit hole = vorige tijd + interval
      v_times[v_hole_idx] := v_times[v_hole_idx]
        + (p_interval_minutes || ' minutes')::interval;

      UPDATE tournament_players
      SET flight_id = v_flight_id
      WHERE id IN (
        SELECT id FROM tournament_players
        WHERE tournament_id = p_tournament_id
          AND category_id = v_category.id
          AND status IN ('registered', 'confirmed')
          AND flight_id IS NULL
        ORDER BY handicap DESC NULLS LAST, name
        LIMIT p_max_players_per_flight
      );

      -- Wissel naar volgend starthole (round-robin)
      v_hole_idx := (v_hole_idx % v_hole_count) + 1;
    END LOOP;
  END LOOP;
END;
$$;
