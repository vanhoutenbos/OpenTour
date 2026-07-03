-- Toegangscode vervaltijd optioneel maken.
-- Voorheen was expires_at verplicht (NOT NULL, default now() + 24h).
-- Organisatoren kunnen nu ook een code aanmaken die nooit verloopt (expires_at = NULL).
-- RLS-policies die op expires_at filteren zijn aangepast: NULL betekent "verloopt nooit".
--
-- LET OP: deze migratie codificeert een schema-wijziging die eerder al direct
-- op de remote database is toegepast (via de Supabase MCP tool, buiten de
-- normale migratieflow om). Dit bestand brengt de lokale migratiegeschiedenis
-- in lijn met de live database zodat `supabase db push`/CI niet meer klagen
-- over drift. De inhoud is 1-op-1 overgenomen van de live schema-state.

-- 1. Kolom nullable maken, geen automatische default meer
ALTER TABLE access_codes
  ALTER COLUMN expires_at DROP NOT NULL,
  ALTER COLUMN expires_at DROP DEFAULT;

-- 2. RLS-policies bijwerken: NULL expires_at = code verloopt nooit

-- access_codes: recorder mag eigen actieve/geldige code inzien
DROP POLICY IF EXISTS "access_codes_select_active" ON access_codes;
CREATE POLICY "access_codes_select_active" ON access_codes
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- tournaments: draft-toernooien zichtbaar voor recorders met geldige code
DROP POLICY IF EXISTS "tournaments_select_recorder" ON tournaments;
CREATE POLICY "tournaments_select_recorder" ON tournaments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = tournaments.id
        AND ac.is_active = true
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
    )
  );

-- scores: recorder mag scores invoeren met geldige code
DROP POLICY IF EXISTS "scores_insert_recorder" ON scores;
CREATE POLICY "scores_insert_recorder" ON scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = scores.tournament_id
        AND ac.is_active = true
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
        AND ac.created_by IN (
          SELECT created_by FROM tournaments WHERE id = scores.tournament_id
        )
    )
  );

-- scores: recorder mag scores bijwerken met geldige code
DROP POLICY IF EXISTS "scores_update_recorder" ON scores;
CREATE POLICY "scores_update_recorder" ON scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = scores.tournament_id
        AND ac.is_active = true
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = scores.tournament_id
        AND ac.is_active = true
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
    )
  );
