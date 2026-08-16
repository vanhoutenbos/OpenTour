import { getSupabaseBrowser } from './supabase-browser';
import { getPendingScores, markScoreSynced, markSyncError } from './offline-db';

export interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ localId: string; error: string }>;
}

export async function syncPendingScores(): Promise<SyncResult> {
  const supabase = getSupabaseBrowser();
  const pending = await getPendingScores();

  const result: SyncResult = { success: 0, failed: 0, errors: [] };

  for (const score of pending) {
    try {
      const { error } = await supabase.rpc('upsert_score_if_newer', {
        p_tournament_id: score.tournament_id,
        p_player_id: score.player_id,
        p_hole_id: score.hole_id,
        p_round_number: score.round_number,
        p_strokes: score.strokes,
        p_updated_at: score.updated_at,
      });

      if (error) {
        throw new Error(error.message || 'Sync failed');
      }

      await markScoreSynced(score.localId);
      result.success++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await markSyncError(score.localId, message);
      result.failed++;
      result.errors.push({ localId: score.localId, error: message });
    }
  }

  return result;
}

export function getSyncBackoffDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 8000);
}
