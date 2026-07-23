-- Ruimt loops.tee_id en loop_holes.tee_id / loop_holes.distance_meters op.
--
-- Onderzoek (2026-07-23): deze kolommen worden nergens in de applicatie gelezen.
-- CourseBuilderForm.tsx zet loop_holes.tee_id en .distance_meters bij elke insert
-- hardcoded op NULL. hole_tee_distances is het daadwerkelijk gebruikte mechanisme
-- voor afstand per (hole, tee) en blijft ongemoeid.
--
-- Fixt daarnaast een RLS-bug: de insert-policy op loop_tee_ratings controleerde
-- of loops.tee_id (het hier verwijderde veld) bij dezelfde baan hoorde als de tee,
-- in plaats van te valideren dat de opgegeven loop_tee_ratings.tee_id zelf bij de
-- baan van de lus hoort. Update-policy had diezelfde check helemaal niet.

-- 1. Policies die loops.tee_id aanraken moeten eerst weg, anders weigert Postgres
--    de kolom te droppen (dependency van de policy-expressie op de kolom).
DROP POLICY IF EXISTS "loop_tee_ratings_insert" ON loop_tee_ratings;
CREATE POLICY "loop_tee_ratings_insert" ON loop_tee_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_tee_ratings.loop_id
        AND c.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tees te
      JOIN loops l ON l.course_id = te.course_id
      WHERE l.id = loop_tee_ratings.loop_id
        AND te.id = loop_tee_ratings.tee_id
    )
  );

DROP POLICY IF EXISTS "loop_tee_ratings_update" ON loop_tee_ratings;
CREATE POLICY "loop_tee_ratings_update" ON loop_tee_ratings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_tee_ratings.loop_id
        AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_tee_ratings.loop_id
        AND c.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tees te
      JOIN loops l ON l.course_id = te.course_id
      WHERE l.id = loop_tee_ratings.loop_id
        AND te.id = loop_tee_ratings.tee_id
    )
  );

-- 2. Nu veilig te droppen kolommen.
ALTER TABLE loop_holes DROP COLUMN IF EXISTS tee_id;
ALTER TABLE loop_holes DROP COLUMN IF EXISTS distance_meters;
ALTER TABLE loops DROP COLUMN IF EXISTS tee_id;
