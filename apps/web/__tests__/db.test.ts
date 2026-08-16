import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, saveScoreLocally, getPendingScores, markScoreSynced, markSyncError } from '../lib/offline-db';

beforeEach(async () => {
  await db.pending_scores.clear();
  await db.local_tournaments.clear();
  await db.local_flights.clear();
});

describe('offline-db', () => {
  it('inserts and retrieves pending scores', async () => {
    const localId = await saveScoreLocally({
      tournament_id: 't1',
      player_id: 'p1',
      hole_id: 'h1',
      round_number: 1,
      strokes: 4,
      updated_at: new Date().toISOString(),
    });

    const pending = await getPendingScores();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.localId).toBe(localId);
    expect(pending[0]!.synced).toBe(false);
    expect(pending[0]!.strokes).toBe(4);
  });

  it('marks score as synced', async () => {
    const localId = await saveScoreLocally({
      tournament_id: 't1',
      player_id: 'p1',
      hole_id: 'h1',
      round_number: 1,
      strokes: 4,
      updated_at: new Date().toISOString(),
    });

    await markScoreSynced(localId);

    const pending = await getPendingScores();
    expect(pending).toHaveLength(0);

    const all = await db.pending_scores.where('localId').equals(localId).first();
    expect(all?.synced).toBe(true);
  });

  it('marks score with sync error', async () => {
    const localId = await saveScoreLocally({
      tournament_id: 't1',
      player_id: 'p1',
      hole_id: 'h1',
      round_number: 1,
      strokes: 4,
      updated_at: new Date().toISOString(),
    });

    await markSyncError(localId, 'Network error');

    const pending = await getPendingScores();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.sync_error).toBe('Network error');
  });

  it('queries pending scores by tournament_id', async () => {
    await saveScoreLocally({
      tournament_id: 't1',
      player_id: 'p1',
      hole_id: 'h1',
      round_number: 1,
      strokes: 4,
      updated_at: new Date().toISOString(),
    });

    await saveScoreLocally({
      tournament_id: 't2',
      player_id: 'p2',
      hole_id: 'h2',
      round_number: 1,
      strokes: 5,
      updated_at: new Date().toISOString(),
    });

    const pending = await getPendingScores();
    expect(pending).toHaveLength(2);

    const t1Scores = await db.pending_scores.where('tournament_id').equals('t1').toArray();
    expect(t1Scores).toHaveLength(1);
    expect(t1Scores[0]!.player_id).toBe('p1');
  });
});
