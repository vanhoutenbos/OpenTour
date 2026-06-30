-- Sync: zelfde inhoud als 20260628190000_tournament_players_delete_policy.sql
-- CLI paste deze migratie opnieuw toe met nieuw timestamp.
CREATE POLICY "tp_delete" ON tournament_players
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_players.tournament_id
        AND t.created_by = auth.uid()
    )
  );
