import 'fake-indexeddb/auto';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../hooks/useSyncOnlineStatus', () => ({
  useSyncOnlineStatus: vi.fn(() => 'offline'),
}));

vi.mock('../lib/supabase-browser');

import { useScoreSync } from '../hooks/useScoreSync';
import * as supabaseBrowser from '../lib/supabase-browser';

describe('useScoreSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseBrowser.getSupabaseBrowser).mockReturnValue({
      rpc: vi.fn(() => Promise.resolve({ error: null })),
    } as any);
  });

  it('saves score locally when offline', async () => {
    const { useSyncOnlineStatus } = await import('../hooks/useSyncOnlineStatus');
    vi.mocked(useSyncOnlineStatus).mockReturnValue('offline');

    const { result } = renderHook(() => useScoreSync());

    const score = {
      tournament_id: 't1',
      player_id: 'p1',
      hole_id: 'h1',
      round_number: 1,
      strokes: 4,
      updated_at: new Date().toISOString(),
    };

    let submitResult: any;
    await act(async () => {
      submitResult = await result.current.submitScore(score);
    });

    expect(submitResult.success).toBe(true);
    expect(submitResult.localId).toBeDefined();
  });

  it('calls upsert when online', async () => {
    const { useSyncOnlineStatus } = await import('../hooks/useSyncOnlineStatus');
    vi.mocked(useSyncOnlineStatus).mockReturnValue('online');

    const mockRpc = vi.fn(() => Promise.resolve({ error: null }));
    vi.mocked(supabaseBrowser.getSupabaseBrowser).mockReturnValue({
      rpc: mockRpc,
    } as any);

    const { result } = renderHook(() => useScoreSync());

    const score = {
      tournament_id: 't1',
      player_id: 'p1',
      hole_id: 'h1',
      round_number: 1,
      strokes: 4,
      updated_at: new Date().toISOString(),
    };

    let submitResult: any;
    await act(async () => {
      submitResult = await result.current.submitScore(score);
    });

    expect(submitResult.success).toBe(true);
    expect(submitResult.localId).toBeUndefined();
  });
});
