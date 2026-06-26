-- ============================================================
-- OpenTour — Migratie: Voeg ontbrekende DELETE policy toe
-- voor de flights tabel.
-- Zonder deze policy kon alleen de tournament-eigenaar via
-- de service-role (RPC) flights verwijderen, maar directe
-- client-side deletes werden stilletjes geblokkeerd.
-- ============================================================

CREATE POLICY "flights_delete" ON flights
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );
