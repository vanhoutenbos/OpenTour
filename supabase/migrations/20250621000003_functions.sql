-- ============================================================
-- OpenTour — Migratie 003: Database functies
-- ============================================================

-- Conditionele upsert: alleen bijwerken als de nieuwe timestamp nieuwer is
-- Dit is de kern van de offline conflictresolutie strategie.
-- Een score ingevoerd op apparaat A (offline) overschrijft nooit een
-- recentere score van apparaat B die al gesynchroniseerd is.
CREATE OR REPLACE FUNCTION upsert_score_if_newer(
  p_tournament_id UUID,
  p_player_id     UUID,
  p_hole_id       UUID,
  p_round_number  INT,
  p_strokes       INT,
  p_updated_at    TIMESTAMPTZ
) RETURNS void AS $$
BEGIN
  INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at)
  VALUES (p_tournament_id, p_player_id, p_hole_id, p_round_number, p_strokes, p_updated_at)
  ON CONFLICT (tournament_id, player_id, hole_id, round_number)
  DO UPDATE SET
    strokes    = EXCLUDED.strokes,
    updated_at = EXCLUDED.updated_at
  WHERE scores.updated_at < EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toegangscode genereren (8 alfanumerieke tekens, hoofdletters)
-- Wordt aangroepen vanuit de Next.js API route door de organisator
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- geen 0/O/1/I voor leesbaarheid
  code  TEXT := '';
  i     INT;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Automatisch updated_at bijwerken via trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
