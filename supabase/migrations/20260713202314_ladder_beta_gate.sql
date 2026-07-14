-- ============================================================
-- OpenTour — Migratie: Laddercompetitie feature-gate
-- ============================================================
-- Laddercompetitie is nog experimenteel. Deze migratie beperkt het
-- AANMAKEN/WIJZIGEN van laddergerelateerde data tot info@vanhoutensolutions.nl,
-- zodat de flow getest kan worden zonder dat andere organisatoren 'm al
-- kunnen kiezen. Zelfde patroon als eerder voorzien voor matchplay
-- (@vanhoutensolutions.nl-domeingating via auth.email()).
--
-- Bewust met RESTRICTIVE policies i.p.v. de bestaande organizer-policies te
-- wijzigen: meerdere PERMISSIVE policies voor dezelfde actie worden met OR
-- gecombineerd (dus een extra permissive policy zou niets beperken), een
-- RESTRICTIVE policy wordt met AND gecombineerd bovenop de bestaande
-- policies. Dit raakt dus geen enkele bestaande, live policy.
--
-- Bewust NIET toegepast op SELECT: het publieke leaderboard (piramide) moet
-- gewoon zichtbaar blijven voor toeschouwers van een ladder-toernooi, zoals
-- bij elk ander publiek toernooi. Alleen mutaties (INSERT/UPDATE/DELETE)
-- worden beperkt.
--
-- Terugdraaien: alle policies hieronder DROP POLICY-en (zie onderaan als
-- commentaar) heropent de flow voor iedereen.
-- ============================================================

BEGIN;

-- ---- tournaments: alleen de gate-gebruiker mag competition_type='ladder' zetten
CREATE POLICY "ladder_beta_gate_tournaments_insert" ON tournaments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    competition_type <> 'ladder' OR LOWER(auth.email()) = 'info@vanhoutensolutions.nl'
  );

CREATE POLICY "ladder_beta_gate_tournaments_update" ON tournaments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    competition_type <> 'ladder' OR LOWER(auth.email()) = 'info@vanhoutensolutions.nl'
  )
  WITH CHECK (
    competition_type <> 'ladder' OR LOWER(auth.email()) = 'info@vanhoutensolutions.nl'
  );

-- ---- ladder_settings / ladder_positions / ladder_challenges: mutaties alleen
-- door de gate-gebruiker. SELECT blijft ongemoeid (publiek leaderboard).
CREATE POLICY "ladder_beta_gate_settings_insert" ON ladder_settings
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');
CREATE POLICY "ladder_beta_gate_settings_update" ON ladder_settings
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (LOWER(auth.email()) = 'info@vanhoutensolutions.nl')
  WITH CHECK (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');
CREATE POLICY "ladder_beta_gate_settings_delete" ON ladder_settings
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');

CREATE POLICY "ladder_beta_gate_positions_insert" ON ladder_positions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');
CREATE POLICY "ladder_beta_gate_positions_update" ON ladder_positions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (LOWER(auth.email()) = 'info@vanhoutensolutions.nl')
  WITH CHECK (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');
CREATE POLICY "ladder_beta_gate_positions_delete" ON ladder_positions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');

CREATE POLICY "ladder_beta_gate_challenges_insert" ON ladder_challenges
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');
CREATE POLICY "ladder_beta_gate_challenges_update" ON ladder_challenges
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (LOWER(auth.email()) = 'info@vanhoutensolutions.nl')
  WITH CHECK (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');
CREATE POLICY "ladder_beta_gate_challenges_delete" ON ladder_challenges
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (LOWER(auth.email()) = 'info@vanhoutensolutions.nl');

COMMIT;

-- Terugdraaien (later, als de beta voorbij is):
-- DROP POLICY "ladder_beta_gate_tournaments_insert" ON tournaments;
-- DROP POLICY "ladder_beta_gate_tournaments_update" ON tournaments;
-- DROP POLICY "ladder_beta_gate_settings_insert" ON ladder_settings;
-- DROP POLICY "ladder_beta_gate_settings_update" ON ladder_settings;
-- DROP POLICY "ladder_beta_gate_settings_delete" ON ladder_settings;
-- DROP POLICY "ladder_beta_gate_positions_insert" ON ladder_positions;
-- DROP POLICY "ladder_beta_gate_positions_update" ON ladder_positions;
-- DROP POLICY "ladder_beta_gate_positions_delete" ON ladder_positions;
-- DROP POLICY "ladder_beta_gate_challenges_insert" ON ladder_challenges;
-- DROP POLICY "ladder_beta_gate_challenges_update" ON ladder_challenges;
-- DROP POLICY "ladder_beta_gate_challenges_delete" ON ladder_challenges;
