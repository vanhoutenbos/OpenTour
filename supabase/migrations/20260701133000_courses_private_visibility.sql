-- ============================================================
-- OpenTour — Private courses with optional public sharing
-- ============================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_courses_visibility
  ON courses (is_public, created_by);

DROP POLICY IF EXISTS "courses_select_public" ON courses;
CREATE POLICY "courses_select_public" ON courses
  FOR SELECT USING (
    is_public = true OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "holes_select" ON holes;
CREATE POLICY "holes_select" ON holes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = course_id
        AND (c.is_public = true OR c.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tees_select" ON tees;
CREATE POLICY "tees_select" ON tees
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = course_id
        AND (c.is_public = true OR c.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "loops_select" ON loops;
CREATE POLICY "loops_select" ON loops
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.id = course_id
        AND (c.is_public = true OR c.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "loop_holes_select" ON loop_holes;
CREATE POLICY "loop_holes_select" ON loop_holes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id
        AND (c.is_public = true OR c.created_by = auth.uid())
    )
  );
