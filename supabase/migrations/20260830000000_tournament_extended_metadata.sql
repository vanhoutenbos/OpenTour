-- ============================================================
-- OpenTour — Migratie: Uitgebreide toernooi-metadata
-- ============================================================
-- Voegt velden toe voor: inschrijfperiode, tarief, max deelnemers,
-- startvorm, team/individueel, leeftijdscriteria, handicapberekening.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS registration_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_fee    NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS max_participants    INT,
  ADD COLUMN IF NOT EXISTS start_format        TEXT,
  ADD COLUMN IF NOT EXISTS competition_mode    TEXT DEFAULT 'individual'
                 CHECK (competition_mode IN ('individual', 'team')),
  ADD COLUMN IF NOT EXISTS age_min             INT,
  ADD COLUMN IF NOT EXISTS age_max             INT,
  ADD COLUMN IF NOT EXISTS handicap_calculation TEXT DEFAULT 'none'
                 CHECK (handicap_calculation IN ('none', 'qualifying', 'social'));
