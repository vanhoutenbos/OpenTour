-- OpenTour — Migratie: ladder_seed_rungs wrapper functie

CREATE OR REPLACE FUNCTION ladder_seed_rungs(
  p_tournament_id UUID,
  p_seeding_method TEXT DEFAULT 'handicap_asc'
) RETURNS VOID AS $$
BEGIN
  IF p_seeding_method NOT IN ('random', 'handicap_asc', 'handicap_desc') THEN
    RAISE EXCEPTION 'Ongeldige sorteermethode: %. Gebruik random, handicap_asc of handicap_desc', p_seeding_method;
  END IF;

  PERFORM generate_ladder_pyramid(
    p_tournament_id,
    p_sort_by => p_seeding_method,
    p_split_by_category => true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
