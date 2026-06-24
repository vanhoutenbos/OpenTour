-- ============================================================
-- OpenTour — Migratie 006: Tees, Loops & Loop Holes
-- ============================================================

-- ============================================================
-- TEES
-- Afslagplaatsen / tee-boxen per golfbaan (course)
-- Een course heeft meerdere tees (bijv. wit, geel, blauw, rood).
-- ============================================================
CREATE TABLE tees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  name          TEXT,
  color         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (course_id, external_id)
);

-- ============================================================
-- LOOPS
-- Een lus is een geordende subset holes die samen een ronde
-- vormen. Standaard: full 18, front 9, back 9.
-- Organisatoren kunnen custom loops maken voor wedstrijden.
-- ============================================================
CREATE TABLE loops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  holes_count   INT NOT NULL CHECK (holes_count > 0),
  loop_type     TEXT NOT NULL CHECK (loop_type IN ('full_18', 'front_9', 'back_9', 'custom')),
  tee_id        UUID REFERENCES tees(id) ON DELETE SET NULL,
  is_default    BOOLEAN DEFAULT false,
  created_by    UUID REFERENCES auth.users,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LOOP_HOLES
-- Koppelt holes aan een loop met volgorde en optionele tee.
-- ============================================================
CREATE TABLE loop_holes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id       UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  hole_id       UUID NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  tee_id        UUID REFERENCES tees(id) ON DELETE SET NULL,
  position      INT NOT NULL CHECK (position > 0),
  UNIQUE (loop_id, position),
  UNIQUE (loop_id, hole_id)
);

-- ============================================================
-- TOURNAMENTS — koppel aan loop i.p.v. direct aan course
-- ============================================================
ALTER TABLE tournaments ADD COLUMN loop_id UUID REFERENCES loops(id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tees_course        ON tees(course_id);
CREATE INDEX idx_loops_course       ON loops(course_id);
CREATE INDEX idx_loops_type         ON loops(loop_type);
CREATE INDEX idx_loop_holes_loop    ON loop_holes(loop_id);
CREATE INDEX idx_tournaments_loop   ON tournaments(loop_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE tees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loops       ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_holes  ENABLE ROW LEVEL SECURITY;

-- Tees: publiek leesbaar; aanpasbaar door eigenaar van de course
CREATE POLICY "tees_select" ON tees
  FOR SELECT USING (true);

CREATE POLICY "tees_insert" ON tees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  );

CREATE POLICY "tees_update" ON tees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  );

CREATE POLICY "tees_delete" ON tees
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  );

-- Loops: publiek leesbaar; aanpasbaar door eigenaar van de course
CREATE POLICY "loops_select" ON loops
  FOR SELECT USING (true);

CREATE POLICY "loops_insert" ON loops
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  );

CREATE POLICY "loops_update" ON loops
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  );

CREATE POLICY "loops_delete" ON loops
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  );

-- Loop_holes: publiek leesbaar; aanpasbaar via loop-eigenaar
CREATE POLICY "loop_holes_select" ON loop_holes
  FOR SELECT USING (true);

CREATE POLICY "loop_holes_insert" ON loop_holes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "loop_holes_update" ON loop_holes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "loop_holes_delete" ON loop_holes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
  );
