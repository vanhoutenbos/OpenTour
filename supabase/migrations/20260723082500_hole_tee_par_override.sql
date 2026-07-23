-- Voegt een optionele par-override per (hole, tee) toe aan hole_tee_distances.
--
-- Afstand varieert altijd per tee (fysieke afstand tot de green vanaf die tee).
-- Par verandert meestal niet per tee, maar kan dat in uitzonderingsgevallen wel
-- (bijv. een hole die vanaf de damestee als par 5 gerekend wordt i.p.v. par 4).
-- NULL betekent: gebruik holes.par (de baanbrede standaardwaarde).
--
-- Bewust niet loop-gebonden: de par van een hole vanaf een tee hangt niet af van
-- met welke andere holes je 'm tot een lus combineert (in tegenstelling tot
-- stroke index, zie 20260723082600_loop_hole_stroke_index.sql).

ALTER TABLE hole_tee_distances
  ADD COLUMN par INT CHECK (par BETWEEN 3 AND 5);

COMMENT ON COLUMN hole_tee_distances.par IS
  'Optionele par-override voor deze hole vanaf deze tee. NULL = gebruik holes.par.';
