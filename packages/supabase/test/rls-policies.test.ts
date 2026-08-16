import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
  connectionTimeoutMillis: 2000,
});

async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database verbinding succesvol');
  } catch (err: any) {
    console.error('❌ Database verbinding mislukt:', err.message);
    throw new Error('Database is niet bereikbaar. Start de lokale Supabase-database en probeer opnieuw.');
  }
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.query('GRANT ALL ON SCHEMA public TO postgres');
  await pool.query('GRANT ALL ON SCHEMA public TO public');

  const migrations = [
    'supabase/migrations/20260621161215_initial_schema.sql',
    'supabase/migrations/20260621193244_indexes.sql',
    'supabase/migrations/20260621193255_functions.sql',
    'supabase/migrations/20260621193318_rls.sql',
    'supabase/migrations/20260621193434_security_fixes.sql',
    'supabase/migrations/20260726130000_update_upsert_return_values.sql',
    'supabase/migrations/20260726140000_recorder_sessions.sql',
    'supabase/migrations/20260726150000_rls_recorder_security.sql',
  ];

  for (const migration of migrations) {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, '../../..', migration), 'utf8');
    await pool.query(sql);
  }

  const seed = require('fs').readFileSync(require('path').join(__dirname, '../../../supabase/seed/development.sql'), 'utf8');
  await pool.query(seed);
}

async function insertTestData() {
  await pool.query("INSERT INTO courses (id, name, location, country, holes_count, source, is_verified) VALUES ('00000000-0000-0000-0000-000000000002', 'Test Course', 'Test Location', 'NL', 18, 'custom', true) ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO holes (id, course_id, number, par, stroke_index) VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 1, 4, 1) ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO tournaments (id, name, course_id, format, rounds, status, created_by) VALUES ('00000000-0000-0000-0000-000000000020', 'Test Tournament', '00000000-0000-0000-0000-000000000002', 'stroke', 1, 'active', '00000000-0000-0000-0000-000000000000') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO profiles (id, display_name, email) VALUES ('00000000-0000-0000-0000-000000000000', 'Test Organizer', 'organizer@test.com') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO profiles (id, display_name, email) VALUES ('00000000-0000-0000-0000-000000000001', 'Test Recorder', 'recorder@test.com') ON CONFLICT DO NOTHING");
  await pool.query("INSERT INTO tournament_players (id, tournament_id, profile_id, name, handicap) VALUES ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Test Player', 18.0) ON CONFLICT DO NOTHING");
}

describe('RLS policies', () => {
  beforeAll(async () => {
    await checkDatabaseConnection();
    await resetDatabase();
    await insertTestData();
  }, 10000);

  afterAll(async () => {
    await pool.end();
  });

  it('Organizer can insert scores for own tournament', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000020';
    const organizerId = '00000000-0000-0000-0000-000000000000';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';

    await pool.query('SET ROLE authenticated');
    await pool.query('SET LOCAL request.jwt.claims = \'{"sub":"' + organizerId + '"}\'');

    const result = await pool.query(
      'INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at) VALUES ($1, $2, $3, 1, 4, now()) RETURNING id',
      [tournamentId, playerId, holeId]
    );

    expect(result.rows.length).toBe(1);
    await pool.query('RESET ROLE');
  });

  it('Recorder with valid access code can insert for that tournament', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000020';
    const recorderId = '00000000-0000-0000-0000-000000000001';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';

    await pool.query('INSERT INTO recorder_sessions (user_id, access_code_id, tournament_id, expires_at) VALUES ($1, $2, $3, now() + interval \'1 hour\')', [recorderId, '00000000-0000-0000-0000-000000000001', tournamentId]);

    await pool.query('SET ROLE authenticated');
    await pool.query('SET LOCAL request.jwt.claims = \'{"sub":"' + recorderId + '"}\'');

    const result = await pool.query(
      'INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at) VALUES ($1, $2, $3, 1, 5, now()) RETURNING id',
      [tournamentId, playerId, holeId]
    );

    expect(result.rows.length).toBe(1);
    await pool.query('RESET ROLE');
  });

  it('Recorder without valid session cannot insert', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000020';
    const otherUserId = '00000000-0000-0000-0000-000000000099';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';

    await pool.query('SET ROLE authenticated');
    await pool.query('SET LOCAL request.jwt.claims = \'{"sub":"' + otherUserId + '"}\'');

    try {
      await pool.query(
        'INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at) VALUES ($1, $2, $3, 1, 4, now())',
        [tournamentId, playerId, holeId]
      );
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe('42501');
    }

    await pool.query('RESET ROLE');
  });

  it('Public leaderboard readable without auth', async () => {
    await pool.query('SET ROLE anon');

    const result = await pool.query('SELECT * FROM tournament_leaderboard WHERE tournament_id = $1', ['00000000-0000-0000-0000-000000000020']);

    expect(result.rows.length).toBeGreaterThanOrEqual(0);

    await pool.query('RESET ROLE');
  });

  it('Draft tournament hidden from unauthorized users', async () => {
    await pool.query("INSERT INTO tournaments (id, name, course_id, format, rounds, status, created_by) VALUES ('00000000-0000-0000-0000-000000000099', 'Draft Tournament', '00000000-0000-0000-0000-000000000002', 'stroke', 1, 'draft', '00000000-0000-0000-0000-000000000000') ON CONFLICT DO NOTHING");

    await pool.query('SET ROLE anon');

    const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', ['00000000-0000-0000-0000-000000000099']);

    expect(result.rows.length).toBe(0);

    await pool.query('RESET ROLE');
  });
});
