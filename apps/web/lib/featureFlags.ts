/**
 * Feature-gating helpers. Laddercompetitie is experimenteel en beperkt tot
 * info@vanhoutensolutions.nl (zie migratie 20260713202314_ladder_beta_gate.sql
 * voor de daadwerkelijke afdwinging via RLS — dit bestand is alleen voor de
 * UI, zodat gebruikers die toch niets mogen geen kapotte knoppen zien).
 *
 * BELANGRIJK: dit is UI-gemak, geen beveiliging. De echte grens ligt in de
 * database (RESTRICTIVE policies). Nooit alleen op deze check vertrouwen.
 */
const LADDER_BETA_EMAILS = ['info@vanhoutensolutions.nl'];

export function isLadderBetaUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return LADDER_BETA_EMAILS.includes(email.toLowerCase());
}
