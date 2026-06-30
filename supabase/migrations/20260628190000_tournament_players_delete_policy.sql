-- DELETE policy ontbrak voor tournament_players, waardoor organisatoren
-- spelers niet konden verwijderen (RLS blokkeerde dit stil)
CREATE POLICY "tp_delete" ON tournament_players
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_players.tournament_id
        AND t.created_by = auth.uid()
    )
  );
