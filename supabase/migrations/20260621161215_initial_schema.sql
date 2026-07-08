-- ============================================================
-- OpenTour — Migratie 001: Initieel schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- Aanvulling op Supabase Auth gebruikers
-- Rollen MVP: 'organizer' en 'recorder'
-- ============================================================
CREATE TABLE profiles (
  id            UUID REFERENCES auth.users PRIMARY KEY,
  display_name  TEXT NOT NULL,
  email         TEXT,
  handicap      FLOAT,
  language      TEXT DEFAULT 'nl' CHECK (language IN ('nl', 'en')),
  role          TEXT DEFAULT 'recorder' CHECK (role IN ('organizer', 'recorder')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COURSES
-- Golfbanen — handmatig aangemaakt of via eGolf4u import
-- ============================================================
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location      TEXT,
  country       TEXT DEFAULT 'NL',
  holes_count   INT NOT NULL DEFAULT 18 CHECK (holes_count > 0),
  source        TEXT DEFAULT 'custom' CHECK (source IN ('egolf4u', 'custom', 'community')),
  external_id   TEXT,
  created_by    UUID REFERENCES auth.users,
  is_verified   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- HOLES
-- Holes per baan — stroke_index is verplicht (NOT NULL)
-- Duplicate stroke_index binnen dezelfde baan niet toegestaan
-- ============================================================
CREATE TABLE holes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  number          INT NOT NULL CHECK (number > 0),
  par             INT NOT NULL CHECK (par BETWEEN 3 AND 5),
  stroke_index    INT NOT NULL CHECK (stroke_index BETWEEN 1 AND 18),
  distance_meters INT,
  UNIQUE (course_id, number),
  UNIQUE (course_id, stroke_index)
);

-- ============================================================
-- TOURNAMENTS
-- Status-machine: draft → active → paused → finished
-- Alle transities zijn omkeerbaar door de organisator
-- ============================================================
CREATE TABLE tournaments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  course_id     UUID REFERENCES courses(id),
  format        TEXT NOT NULL CHECK (format IN ('strokeplay', 'stableford', 'matchplay')),
  scoring_type  TEXT DEFAULT 'gross' CHECK (scoring_type IN ('gross', 'net')),
  rounds        INT NOT NULL DEFAULT 1 CHECK (rounds > 0),
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'finished')),
  pause_reason  TEXT,
  is_public     BOOLEAN DEFAULT true,
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FLIGHTS
-- Startgroepen binnen een toernooi
-- ============================================================
CREATE TABLE flights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  start_time    TIMESTAMPTZ,
  tee_number    INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TOURNAMENT_PLAYERS
-- Deelnemers per toernooi
-- Statussen conform NGF-wedstrijdregels
-- ============================================================
CREATE TABLE tournament_players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  flight_id     UUID REFERENCES flights(id),
  profile_id    UUID REFERENCES profiles(id),
  name          TEXT NOT NULL,
  email         TEXT,
  handicap      FLOAT CHECK (handicap BETWEEN -10 AND 54),
  status        TEXT DEFAULT 'registered'
                CHECK (status IN ('registered', 'confirmed', 'withdrawn', 'dns', 'dnf', 'dsq')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, profile_id)
);

-- ============================================================
-- SCORES
-- Conditionele upsert: meest recente updated_at wint
-- Zie functie upsert_score_if_newer in migratie 003
-- ============================================================
CREATE TABLE scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  player_id     UUID REFERENCES tournament_players(id) ON DELETE CASCADE NOT NULL,
  hole_id       UUID REFERENCES holes(id) NOT NULL,
  round_number  INT NOT NULL DEFAULT 1 CHECK (round_number > 0),
  strokes       INT NOT NULL CHECK (strokes BETWEEN 1 AND 99),
  recorded_by   UUID REFERENCES auth.users,
  is_verified   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, player_id, hole_id, round_number)
);

-- ============================================================
-- ACCESS_CODES
-- 8-tekens inlogcodes voor recorders zonder volledig account
-- Rate limiting: 5 pogingen / 5 min per IP (via Cloudflare Worker)
-- ============================================================
CREATE TABLE access_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  tournament_id   UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  created_by      UUID REFERENCES auth.users NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MATCHPLAY_PAIRINGS
-- 1v1 koppelingen voor matchplay toernooien
-- ============================================================
CREATE TABLE matchplay_pairings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  player_a_id   UUID REFERENCES tournament_players(id) NOT NULL,
  player_b_id   UUID REFERENCES tournament_players(id) NOT NULL,
  flight_id     UUID REFERENCES flights(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, player_a_id, player_b_id)
);
