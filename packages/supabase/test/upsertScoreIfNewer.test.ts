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
    'supabase/migrations/20260726130000_update_upsert_return_values.sql',
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
  await pool.query("INSERT INTO tournament_players (id, tournament_id, profile_id, name, handicap) VALUES ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Test Player', 18.0) ON CONFLICT DO NOTHING");
}

describe('upsert_score_if_newer', () => {
  beforeAll(async () => {
    await checkDatabaseConnection();
    await resetDatabase();
    await insertTestData();
  }, 10000);

  afterAll(async () => {
    await pool.end();
  });

  it('should insert a new score and return score_id with was_updated=false', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000020';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';
    const roundNumber = 1;
    const strokes = 5;
    const updatedAt = new Date().toISOString();

    const result = await pool.query(
      'SELECT * FROM upsert_score_if_newer($1, $2, $3, $4, $5, $6)',
      [tournamentId, playerId, holeId, roundNumber, strokes, updatedAt]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].score_id).toBeDefined();
    expect(result.rows[0].was_updated).toBe(false);

    const score = await pool.query(
      'SELECT strokes, updated_at FROM scores WHERE id = $1',
      [result.rows[0].score_id]
    );
    expect(score.rows[0].strokes).toBe(strokes);
  });

  it('should update an existing score when newer and return was_updated=true', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000020';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';
    const roundNumber = 1;
    const oldStrokes = 6;
    const oldUpdatedAt = new Date(Date.now() - 10000).toISOString();
    const newStrokes = 5;
    const newUpdatedAt = new Date().toISOString();

    await pool.query(
      'INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [tournamentId, playerId, holeId, roundNumber, oldStrokes, oldUpdatedAt]
    );

    const result = await pool.query(
      'SELECT * FROM upsert_score_if_newer($1, $2, $3, $4, $5, $6)',
      [tournamentId, playerId, holeId, roundNumber, newStrokes, newUpdatedAt]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].was_updated).toBe(true);

    const score = await pool.query(
      'SELECT strokes FROM scores WHERE id = $1',
      [result.rows[0].score_id]
    );
    expect(score.rows[0].strokes).toBe(newStrokes);
  });

  it('should NOT update an existing score when older and return was_updated=false', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000020';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';
    const roundNumber = 1;
    const oldStrokes = 6;
    const oldUpdatedAt = new Date().toISOString();
    const newStrokes = 5;
    const newUpdatedAt = new Date(Date.now() - 10000).toISOString();

    await pool.query(
      'INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [tournamentId, playerId, holeId, roundNumber, oldStrokes, oldUpdatedAt]
    );

    const result = await pool.query(
      'SELECT * FROM upsert_score_if_newer($1, $2, $3, $4, $5, $6)',
      [tournamentId, playerId, holeId, roundNumber, newStrokes, newUpdatedAt]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].was_updated).toBe(false);

    const score = await pool.query(
      'SELECT strokes FROM scores WHERE id = $1',
      [result.rows[0].score_id]
    );
    expect(score.rows[0].strokes).toBe(oldStrokes);
  });

  it('should handle invalid tournament_id gracefully', async () => {
    const tournamentId = '00000000-0000-0000-0000-000000000099';
    const playerId = '00000000-0000-0000-0000-000000000030';
    const holeId = '00000000-0000-0000-0000-000000000010';
    const roundNumber = 1;
    const strokes = 5;
    const updatedAt = new Date().toISOString();

    const result = await pool.query(
      'SELECT * FROM upsert_score_if_newer($1, $2, $3, $4, $5, $6)',
      [tournamentId, playerId, holeId, roundNumber, strokes, updatedAt]
    );

    expect(result.rows.length).toBe(0);
  });
});
