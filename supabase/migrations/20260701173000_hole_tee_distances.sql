-- ============================================================
-- OpenTour — Tee-specific distance per hole (independent of loops)
-- ============================================================

CREATE TABLE IF NOT EXISTS hole_tee_distances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hole_id UUID NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  tee_id UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  distance_meters INT NOT NULL CHECK (distance_meters >= 0 AND distance_meters <= 999),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (hole_id, tee_id)
);

CREATE INDEX IF NOT EXISTS idx_hole_tee_distances_hole ON hole_tee_distances(hole_id);
CREATE INDEX IF NOT EXISTS idx_hole_tee_distances_tee ON hole_tee_distances(tee_id);

ALTER TABLE hole_tee_distances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hole_tee_distances_select" ON hole_tee_distances
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM holes h
      JOIN courses c ON c.id = h.course_id
      WHERE h.id = hole_id
        AND (c.is_public = true OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "hole_tee_distances_insert" ON hole_tee_distances
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM holes h
      JOIN courses c ON c.id = h.course_id
      WHERE h.id = hole_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "hole_tee_distances_update" ON hole_tee_distances
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM holes h
      JOIN courses c ON c.id = h.course_id
      WHERE h.id = hole_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "hole_tee_distances_delete" ON hole_tee_distances
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM holes h
      JOIN courses c ON c.id = h.course_id
      WHERE h.id = hole_id
        AND c.created_by = auth.uid()
    )
  );
