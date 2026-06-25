-- ============================================================
-- OpenTour — Migratie 009: uitgebreide spelervelden
-- ============================================================

-- Bestaande kolommen behouden.
-- gender text al toegevoegd in eerdere migratiepoging; IF NOT EXISTS.
ALTER TABLE tournament_players
  ADD COLUMN IF NOT EXISTS              gender text,
  ADD COLUMN IF NOT EXISTS              initials text,
  ADD COLUMN IF NOT EXISTS              call_name text,
  ADD COLUMN IF NOT EXISTS              prefix text,
  ADD COLUMN IF NOT EXISTS              last_name text,
  ADD COLUMN IF NOT EXISTS              date_of_birth date,
  ADD COLUMN IF NOT EXISTS              street text,
  ADD COLUMN IF NOT EXISTS              house_number text,
  ADD COLUMN IF NOT EXISTS              house_number_addition text,
  ADD COLUMN IF NOT EXISTS              postal_code text,
  ADD COLUMN IF NOT EXISTS              city text,
  ADD COLUMN IF NOT EXISTS              country text DEFAULT 'Nederland',
  ADD COLUMN IF NOT EXISTS              phone text,
  ADD COLUMN IF NOT EXISTS              ngf_number text;
