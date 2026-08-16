-- OpenTour — Migratie: upsert_score_if_newer retourneert score_id + was_updated

CREATE OR REPLACE FUNCTION upsert_score_if_newer(
  p_tournament_id UUID,
  p_player_id     UUID,
  p_hole_id       UUID,
  p_round_number  INT,
  p_strokes       INT,
  p_updated_at    TIMESTAMPTZ
) RETURNS TABLE (
  score_id     UUID,
  was_updated  BOOLEAN
) AS $$
DECLARE
  existing_score RECORD;
BEGIN
  SELECT id, updated_at INTO existing_score
  FROM scores
  WHERE tournament_id = p_tournament_id
    AND player_id = p_player_id
    AND hole_id = p_hole_id
    AND round_number = p_round_number;

  IF existing_score.id IS NULL THEN
    INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at)
    VALUES (p_tournament_id, p_player_id, p_hole_id, p_round_number, p_strokes, p_updated_at)
    RETURNING id INTO score_id;
    was_updated := false;
  ELSIF existing_score.updated_at < p_updated_at THEN
    UPDATE scores
    SET strokes = p_strokes, updated_at = p_updated_at
    WHERE id = existing_score.id
    RETURNING id INTO score_id;
    was_updated := true;
  ELSE
    score_id := existing_score.id;
    was_updated := false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
