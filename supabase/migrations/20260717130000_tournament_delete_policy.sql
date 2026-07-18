-- Sta de organisator toe om een eigen toernooi te verwijderen.
--
-- Er bestond nog geen DELETE-policy op tournaments, dus RLS blokkeerde dit
-- volledig (default deny). Alle child-tabellen (scores, flights,
-- tournament_players, access_codes, matchplay_pairings, tournament_holes,
-- tournament_tees, tournament_categories, ladder_settings, ladder_positions,
-- ladder_challenges) hebben al `tournament_id REFERENCES tournaments(id)
-- ON DELETE CASCADE`, dus een DELETE op tournaments ruimt alle gerelateerde
-- data automatisch op in dezelfde transactie. Geverifieerd via een
-- BEGIN...ROLLBACK dry-run op de live database (incl. de kolommen die via
-- NO ACTION naar sibling-tabellen verwijzen, zoals scores.hole_id en
-- matchplay_pairings.player_a_id/player_b_id — die rijen worden binnen
-- dezelfde statement óók cascade-verwijderd, dus er blijven geen orphans over).
CREATE POLICY "organizer_delete_tournament" ON tournaments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());
