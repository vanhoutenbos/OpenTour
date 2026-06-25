-- Fix: tournaments_select_recorder policy had ac.tournament_id = ac.id
-- waardoor de subquery zichzelf vergeleek i.p.v. de outer tournaments tabel.
-- Dit veroorzaakte een near-infinite scan bij elke SELECT op tournaments.

DROP POLICY IF EXISTS "tournaments_select_recorder" ON tournaments;

CREATE POLICY "tournaments_select_recorder" ON tournaments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM access_codes ac
      WHERE ac.tournament_id = tournaments.id
        AND ac.is_active = true
        AND ac.expires_at > now()
    )
  );
