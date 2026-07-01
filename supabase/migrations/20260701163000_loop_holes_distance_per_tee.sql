-- ============================================================
-- OpenTour — Tee-specific hole distances on loop_holes
-- ============================================================

ALTER TABLE loop_holes
  ADD COLUMN IF NOT EXISTS distance_meters INT CHECK (distance_meters IS NULL OR (distance_meters >= 0 AND distance_meters <= 999));
