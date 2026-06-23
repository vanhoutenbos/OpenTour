-- Fix 1: Views instellen op SECURITY INVOKER
ALTER VIEW tournament_leaderboard SET (security_invoker = true);
ALTER VIEW matchplay_standings    SET (security_invoker = true);

-- Fix 2: search_path vergrendelen voor alle functies
ALTER FUNCTION upsert_score_if_newer(UUID, UUID, UUID, INT, INT, TIMESTAMPTZ)
  SET search_path = public;

ALTER FUNCTION generate_access_code()
  SET search_path = public;

ALTER FUNCTION set_updated_at()
  SET search_path = public;

-- Fix 3: anon mag upsert_score_if_newer NIET aanroepen
REVOKE EXECUTE ON FUNCTION upsert_score_if_newer(UUID, UUID, UUID, INT, INT, TIMESTAMPTZ)
  FROM anon;

GRANT EXECUTE ON FUNCTION upsert_score_if_newer(UUID, UUID, UUID, INT, INT, TIMESTAMPTZ)
  TO authenticated;
