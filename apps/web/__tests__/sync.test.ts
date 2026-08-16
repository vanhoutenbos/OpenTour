import { describe, expect, it, vi, beforeEach } from 'vitest';
import { syncPendingScores, getSyncBackoffDelay } from '../lib/sync';

const mockSupabase = {
  rpc: vi.fn(),
};

vi.mock('../lib/supabase-browser', () => ({
  getSupabaseBrowser: () => mockSupabase,
}));

vi.mock('../lib/offline-db', () => ({
  getPendingScores: vi.fn(),
  markScoreSynced: vi.fn(),
  markSyncError: vi.fn(),
}));

describe('sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.rpc.mockResolvedValue({ error: null });
  });

  it('syncs pending scores successfully', async () => {
    const { getPendingScores, markScoreSynced } = await import('../lib/offline-db');
    vi.mocked(getPendingScores).mockResolvedValue([
      {
        localId: 'local1',
        tournament_id: 't1',
        player_id: 'p1',
        hole_id: 'h1',
        round_number: 1,
        strokes: 4,
        updated_at: new Date().toISOString(),
      },
    ] as any);

    const result = await syncPendingScores();

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(markScoreSynced).toHaveBeenCalledWith('local1');
  });

  it('handles sync failures gracefully', async () => {
    const { getPendingScores, markSyncError } = await import('../lib/offline-db');
    vi.mocked(getPendingScores).mockResolvedValue([
      {
        localId: 'local1',
        tournament_id: 't1',
        player_id: 'p1',
        hole_id: 'h1',
        round_number: 1,
        strokes: 4,
        updated_at: new Date().toISOString(),
      },
    ] as any);

    mockSupabase.rpc.mockResolvedValue({ error: { message: 'Network error' } });

    const result = await syncPendingScores();

    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]!.error).toBe('Network error');
    expect(markSyncError).toHaveBeenCalledWith('local1', 'Network error');
  });

  it('calculates exponential backoff delays', () => {
    expect(getSyncBackoffDelay(0)).toBe(1000);
    expect(getSyncBackoffDelay(1)).toBe(2000);
    expect(getSyncBackoffDelay(2)).toBe(4000);
    expect(getSyncBackoffDelay(3)).toBe(8000);
    expect(getSyncBackoffDelay(4)).toBe(8000);
  });
});
