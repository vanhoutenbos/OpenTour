-- ============================================================
-- OpenTour — Migratie: Slope- en course rating per lus
--
-- Achtergrond: WHS slope rating en course rating hangen niet
-- alleen af van teebox (kleur) en geslacht, maar ook van welke
-- lus je loopt. Voorbeeld (De Haenen, heren, geel):
--   - 18 holes (volledige lus)      -> slope 126, course rating 68.5
--   - Voor 9 (front_9, losse lus)   -> slope 122, course rating 35.0
--
-- Tot nu toe stond slope_rating/course_rating alleen op `tees`
-- (één waarde per kleur + geslacht), zonder rekening te houden
-- met de lus. Bij activatie van een toernooi met een 9-holes lus
-- werd dus altijd de 18-holes rating bevroren in `tournament_tees`
-- — incorrect voor de net-scoring berekening.
--
-- Oplossing: nieuwe tabel `loop_tee_ratings` die per (loop, tee)
-- combinatie een eigen slope_rating/course_rating kan vastleggen.
-- Ontbreekt er een override voor een specifieke lus, dan valt de
-- snapshot-trigger terug op de generieke rating van `tees`
-- (bijv. voor courses die nog geen per-lus ratings hebben ingevuld,
-- of voor toernooien zonder loop_id).
--
-- `tees.slope_rating` / `tees.course_rating` blijven bestaan als
-- fallback/default-waarde (in de praktijk meestal de 18-holes
-- rating) — er is bewust geen data-migratie nodig.
-- ============================================================

-- ============================================================
-- 1. LOOP_TEE_RATINGS
-- Eén rij per combinatie van lus (loop) en teebox (tee).
-- De teebox zelf bevat al kleur + geslacht (zie migratie
-- 20260708130000_add_gender_to_tees.sql), dus hier hoeft geslacht
-- niet herhaald te worden.
-- ============================================================
CREATE TABLE loop_tee_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id       UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  tee_id        UUID NOT NULL REFERENCES tees(id) ON DELETE CASCADE,
  slope_rating  INT CHECK (slope_rating BETWEEN 55 AND 155),
  course_rating NUMERIC(4,1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (loop_id, tee_id)
);

COMMENT ON TABLE loop_tee_ratings IS
  'Per-lus WHS-rating overrides. Eén teebox (kleur + geslacht) kan een '
  'andere slope_rating/course_rating hebben per lus (bijv. 18 holes vs. '
  'losse voor-9 of achter-9). Ontbreekt een rij voor een (loop, tee) '
  'combinatie, dan geldt de generieke rating uit tees.slope_rating / '
  'tees.course_rating als fallback.';

CREATE INDEX idx_loop_tee_ratings_loop ON loop_tee_ratings(loop_id);
CREATE INDEX idx_loop_tee_ratings_tee  ON loop_tee_ratings(tee_id);

CREATE TRIGGER trg_loop_tee_ratings_updated_at
  BEFORE UPDATE ON loop_tee_ratings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. RLS — zelfde patroon als tees/loops: publiek leesbaar,
-- schrijfbaar door de eigenaar van de course (via loop -> course).
-- ============================================================
ALTER TABLE loop_tee_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loop_tee_ratings_select" ON loop_tee_ratings
  FOR SELECT USING (true);

CREATE POLICY "loop_tee_ratings_insert" ON loop_tee_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
    AND EXISTS (
      -- de teebox moet bij dezelfde course horen als de lus
      SELECT 1 FROM tees te
      JOIN loops l ON l.id = loop_id
      WHERE te.id = tee_id AND te.course_id = l.course_id
    )
  );

CREATE POLICY "loop_tee_ratings_update" ON loop_tee_ratings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "loop_tee_ratings_delete" ON loop_tee_ratings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loops l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = loop_id AND c.created_by = auth.uid()
    )
  );

-- ============================================================
-- 3. Snapshot-trigger bijwerken: gebruik de lus-specifieke rating
-- (indien aanwezig) i.p.v. altijd de generieke tees-rating.
--
-- Gedrag:
--   - tournament heeft een loop_id EN er bestaat een
--     loop_tee_ratings-rij voor (loop_id, tee.id)  -> gebruik die
--   - anders                                        -> val terug op
--     tees.slope_rating / tees.course_rating (huidig gedrag)
-- ============================================================
CREATE OR REPLACE FUNCTION public.freeze_tournament_course_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournament_holes WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
    SELECT NEW.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters
    FROM holes h WHERE h.course_id = NEW.course_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tournament_tees WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating, gender)
    SELECT
      NEW.id,
      te.id,
      te.name,
      te.color,
      COALESCE(ltr.slope_rating, te.slope_rating)   AS slope_rating,
      COALESCE(ltr.course_rating, te.course_rating) AS course_rating,
      te.gender::text::public.gender_category
    FROM tees te
    LEFT JOIN loop_tee_ratings ltr
      ON ltr.tee_id = te.id AND ltr.loop_id = NEW.loop_id
    WHERE te.course_id = NEW.course_id;
  END IF;

  RETURN NEW;
END;
$function$;
