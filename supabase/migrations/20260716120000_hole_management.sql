-- ============================================================
-- Hole management: add/edit/delete holes on an owned course
-- ============================================================
-- Context: holes could until now only be created in bulk when a course
-- was first built (CourseBuilderForm). There was no UPDATE-safe way to
-- renumber a hole (course_id, number) and (course_id, stroke_index) are
-- UNIQUE per course, so a naive UPDATE can collide with a neighbouring
-- hole mid-edit), and there was no DELETE policy on `holes` at all.
--
-- This migration:
--   1. Makes the (course_id, number) and (course_id, stroke_index) unique
--      constraints DEFERRABLE, so a single transaction can temporarily
--      hold two holes with "swapped" values before the final state is
--      checked at commit time.
--   2. Adds the missing owner-only DELETE policy on `holes`.
--   3. Adds `update_hole()`, an RPC that updates a hole's number/par/
--      stroke_index/distance and automatically swaps values with any
--      colliding hole in the same course (so renumbering "just works"
--      from the UI without the client orchestrating multiple requests).
--   4. Adds triggers to keep `loops.holes_count` and `courses.holes_count`
--      in sync whenever holes are removed/added (previously only set
--      once, at course-creation time).
--
-- Safe for tournaments in progress: since the tournament_course_snapshot
-- migration (20260707112626), scores.hole_id points at tournament_holes
-- (a frozen copy), not at holes.id directly. Editing/deleting a live
-- hole here has no effect on already-activated tournaments.
-- ============================================================

-- ── 1. Deferrable uniqueness so update_hole() can swap safely ──────────
ALTER TABLE holes DROP CONSTRAINT holes_course_id_number_key;
ALTER TABLE holes ADD CONSTRAINT holes_course_id_number_key
  UNIQUE (course_id, number) DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE holes DROP CONSTRAINT holes_course_id_stroke_index_key;
ALTER TABLE holes ADD CONSTRAINT holes_course_id_stroke_index_key
  UNIQUE (course_id, stroke_index) DEFERRABLE INITIALLY IMMEDIATE;

-- ── 2. Missing DELETE policy (owner only, same shape as holes_update) ──
CREATE POLICY "holes_delete" ON holes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = holes.course_id AND c.created_by = auth.uid()
    )
  );

-- ── 3. Atomic hole update with automatic swap-on-conflict ─────────────
-- SECURITY INVOKER (default): runs as the calling user, so the ownership
-- check below and the underlying UPDATEs are both still subject to RLS.
CREATE OR REPLACE FUNCTION update_hole(
  p_hole_id UUID,
  p_number INT,
  p_par INT,
  p_stroke_index INT,
  p_distance_meters INT
) RETURNS holes
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID;
  v_old_number INT;
  v_old_stroke_index INT;
  v_conflict_number_id UUID;
  v_conflict_si_id UUID;
  v_result holes;
BEGIN
  SELECT course_id, number, stroke_index
    INTO v_course_id, v_old_number, v_old_stroke_index
    FROM holes WHERE id = p_hole_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Hole niet gevonden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM courses WHERE id = v_course_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Geen toegang tot deze baan';
  END IF;

  IF p_par NOT BETWEEN 3 AND 5 THEN
    RAISE EXCEPTION 'Par moet tussen 3 en 5 liggen';
  END IF;

  IF p_stroke_index NOT BETWEEN 1 AND 18 THEN
    RAISE EXCEPTION 'Stroke index moet tussen 1 en 18 liggen';
  END IF;

  IF p_number < 1 THEN
    RAISE EXCEPTION 'Holenummer moet groter dan 0 zijn';
  END IF;

  -- Defer uniqueness checks to end of transaction: the swap below
  -- briefly needs two holes to "pass through" each other's old values.
  SET CONSTRAINTS holes_course_id_number_key, holes_course_id_stroke_index_key DEFERRED;

  SELECT id INTO v_conflict_number_id
    FROM holes WHERE course_id = v_course_id AND number = p_number AND id <> p_hole_id;

  SELECT id INTO v_conflict_si_id
    FROM holes WHERE course_id = v_course_id AND stroke_index = p_stroke_index AND id <> p_hole_id;

  -- Whichever hole currently holds the target number/SI receives this
  -- hole's OLD number/SI in return, so both slots stay filled and unique.
  IF v_conflict_number_id IS NOT NULL THEN
    UPDATE holes SET number = v_old_number WHERE id = v_conflict_number_id;
  END IF;

  IF v_conflict_si_id IS NOT NULL THEN
    UPDATE holes SET stroke_index = v_old_stroke_index WHERE id = v_conflict_si_id;
  END IF;

  UPDATE holes
    SET number = p_number,
        par = p_par,
        stroke_index = p_stroke_index,
        distance_meters = p_distance_meters
    WHERE id = p_hole_id
    RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION update_hole(UUID, INT, INT, INT, INT) TO authenticated;

-- ── 4a. Keep loops.holes_count in sync when a loop_holes row disappears ─
-- (e.g. cascaded from a hole delete, or a manual loop_holes delete).
CREATE OR REPLACE FUNCTION sync_loop_holes_count() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE loops
    SET holes_count = (SELECT count(*) FROM loop_holes WHERE loop_id = OLD.loop_id)
    WHERE id = OLD.loop_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_loop_holes_count ON loop_holes;
CREATE TRIGGER trg_sync_loop_holes_count
  AFTER DELETE ON loop_holes
  FOR EACH ROW
  EXECUTE FUNCTION sync_loop_holes_count();

-- ── 4b. Keep courses.holes_count in sync whenever holes are added/removed ─
-- (previously only ever set once, at course-creation time).
CREATE OR REPLACE FUNCTION sync_course_holes_count() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID := COALESCE(NEW.course_id, OLD.course_id);
BEGIN
  UPDATE courses
    SET holes_count = (SELECT count(*) FROM holes WHERE course_id = v_course_id)
    WHERE id = v_course_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_holes_count ON holes;
CREATE TRIGGER trg_sync_course_holes_count
  AFTER INSERT OR DELETE ON holes
  FOR EACH ROW
  EXECUTE FUNCTION sync_course_holes_count();
