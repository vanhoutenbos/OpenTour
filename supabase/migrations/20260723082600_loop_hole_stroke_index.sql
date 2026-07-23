-- Stroke index is een rangschikking van moeilijkheid over een volledige ronde
-- (1 t/m 18), niet een vaste eigenschap van een losse hole. Dezelfde fysieke
-- hole kan dus een andere SI hebben afhankelijk van met welke andere holes hij
-- tot een lus (18-holes combinatie) samengevoegd wordt — relevant bij banen met
-- meer dan 18 holes (bijv. 27-holes: 3 lussen van elk 18, elk met eigen SI-kaart),
-- en kan bovendien per tee (m.n. per geslacht) verschillen: een Heren-SI-kaart en
-- een Dames-SI-kaart voor dezelfde lus zijn vaak verschillend geordend.
--
-- Ontbreekt een rij voor een (loop, hole, tee) combinatie, dan geldt holes.stroke_index
-- als terugval — de meeste banen met één lus over de hele baan hoeven dus niets
-- nieuws in te vullen.

CREATE TABLE loop_hole_stroke_index (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id       UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  hole_id       UUID NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  tee_id        UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  stroke_index  INT NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT loop_hole_stroke_index_unique_row UNIQUE (loop_id, hole_id, tee_id),
  -- Deferrable: upsert_loop_hole_stroke_index hieronder moet twee holes tijdelijk
  -- dezelfde SI kunnen laten "passeren" tijdens een swap, net als update_hole()
  -- dat al doet voor holes.stroke_index.
  CONSTRAINT loop_hole_stroke_index_unique_si UNIQUE (loop_id, tee_id, stroke_index) DEFERRABLE INITIALLY IMMEDIATE
);

COMMENT ON TABLE loop_hole_stroke_index IS
  'Per-lus, per-tee stroke-index overrides. Ontbreekt een rij, dan geldt holes.stroke_index als terugval.';

CREATE INDEX idx_loop_hole_stroke_index_loop_tee ON loop_hole_stroke_index(loop_id, tee_id);

ALTER TABLE loop_hole_stroke_index ENABLE ROW LEVEL SECURITY;

-- Zelfde patroon als holes/tees/loops: publiek leesbaar voor publieke banen,
-- altijd leesbaar voor de eigenaar (ongeacht is_public), schrijven alleen door
-- de eigenaar van de baan.
CREATE POLICY "loop_hole_stroke_index_select" ON loop_hole_stroke_index
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND (c.is_public = true OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "loop_hole_stroke_index_insert" ON loop_hole_stroke_index
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND c.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tees te
      JOIN loops l ON l.course_id = te.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND te.id = loop_hole_stroke_index.tee_id
    )
    AND EXISTS (
      SELECT 1 FROM holes h
      JOIN loops l ON l.course_id = h.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND h.id = loop_hole_stroke_index.hole_id
    )
  );

CREATE POLICY "loop_hole_stroke_index_update" ON loop_hole_stroke_index
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "loop_hole_stroke_index_delete" ON loop_hole_stroke_index
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_hole_stroke_index.loop_id
        AND c.created_by = auth.uid()
    )
  );

-- Swap-safe upsert, zelfde patroon als update_hole(): als de gewenste stroke_index
-- binnen deze (loop, tee) al bij een andere hole hoort, krijgt die hole de oude
-- waarde van de huidige hole terug in plaats van dat de update faalt.
CREATE OR REPLACE FUNCTION public.upsert_loop_hole_stroke_index(
  p_loop_id UUID,
  p_hole_id UUID,
  p_tee_id UUID,
  p_stroke_index INT
) RETURNS loop_hole_stroke_index
LANGUAGE plpgsql
AS $function$
DECLARE
  v_course_id UUID;
  v_loop_course_id UUID;
  v_tee_course_id UUID;
  v_hole_course_id UUID;
  v_old_stroke_index INT;
  v_conflict_id UUID;
  v_result loop_hole_stroke_index;
BEGIN
  SELECT course_id INTO v_loop_course_id FROM loops WHERE id = p_loop_id;
  SELECT course_id INTO v_tee_course_id FROM tees WHERE id = p_tee_id;
  SELECT course_id INTO v_hole_course_id FROM holes WHERE id = p_hole_id;

  IF v_loop_course_id IS NULL OR v_tee_course_id IS NULL OR v_hole_course_id IS NULL THEN
    RAISE EXCEPTION 'Lus, tee of hole niet gevonden';
  END IF;

  IF v_loop_course_id <> v_tee_course_id OR v_loop_course_id <> v_hole_course_id THEN
    RAISE EXCEPTION 'Lus, tee en hole horen niet allemaal bij dezelfde baan';
  END IF;

  v_course_id := v_loop_course_id;

  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = v_course_id AND created_by = auth.uid()) THEN
    RAISE EXCEPTION 'Geen toegang tot deze baan';
  END IF;

  IF p_stroke_index NOT BETWEEN 1 AND 18 THEN
    RAISE EXCEPTION 'Stroke index moet tussen 1 en 18 liggen';
  END IF;

  SET CONSTRAINTS loop_hole_stroke_index_unique_si DEFERRED;

  SELECT stroke_index INTO v_old_stroke_index
    FROM loop_hole_stroke_index
    WHERE loop_id = p_loop_id AND hole_id = p_hole_id AND tee_id = p_tee_id;

  SELECT id INTO v_conflict_id
    FROM loop_hole_stroke_index
    WHERE loop_id = p_loop_id AND tee_id = p_tee_id AND stroke_index = p_stroke_index
      AND hole_id <> p_hole_id;

  IF v_conflict_id IS NOT NULL AND v_old_stroke_index IS NOT NULL THEN
    UPDATE loop_hole_stroke_index SET stroke_index = v_old_stroke_index WHERE id = v_conflict_id;
  ELSIF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Stroke index % is al in gebruik binnen deze lus en tee', p_stroke_index;
  END IF;

  INSERT INTO loop_hole_stroke_index (loop_id, hole_id, tee_id, stroke_index)
  VALUES (p_loop_id, p_hole_id, p_tee_id, p_stroke_index)
  ON CONFLICT (loop_id, hole_id, tee_id)
  DO UPDATE SET stroke_index = EXCLUDED.stroke_index
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;
