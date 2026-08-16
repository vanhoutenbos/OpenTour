-- OpenTour — Migratie: recorder_sessions tabel voor RLS security

CREATE TABLE IF NOT EXISTS recorder_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, tournament_id)
);

CREATE INDEX idx_recorder_sessions_user_id ON recorder_sessions(user_id);
CREATE INDEX idx_recorder_sessions_tournament_id ON recorder_sessions(tournament_id);
CREATE INDEX idx_recorder_sessions_expires_at ON recorder_sessions(expires_at);
