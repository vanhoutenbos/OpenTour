-- OpenTour — Migratie: display_name voor spelers

ALTER TABLE tournament_players
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS display_name_alias text,
  ADD CONSTRAINT display_name_check CHECK (display_name IN ('full', 'initials', 'alias'));