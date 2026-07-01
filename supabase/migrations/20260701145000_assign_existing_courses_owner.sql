-- ============================================================
-- OpenTour — Assign existing courses to a single owner
-- ============================================================

DO $$
DECLARE
  owner_user_id UUID;
BEGIN
  SELECT id
    INTO owner_user_id
  FROM profiles
  WHERE email = 'info@vanhoutensolutions.nl'
  ORDER BY created_at ASC
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RAISE NOTICE 'No profile found for info@vanhoutensolutions.nl; existing courses were not reassigned.';
  ELSE
    UPDATE courses
      SET created_by = owner_user_id
    WHERE created_by IS NULL;
  END IF;
END $$;
