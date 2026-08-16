import { useCallback } from 'react';
import { useSyncOnlineStatus } from './useSyncOnlineStatus';
import { saveScoreLocally } from '../lib/offline-db';
import { getSupabaseBrowser } from '../lib/supabase-browser';

export interface ScoreData {
  tournament_id: string;
  player_id: string;
  hole_id: string;
  round_number: number;
  strokes: number;
  updated_at: string;
}

export interface SubmitScoreResult {
  success: boolean;
  localId?: string;
  error?: string;
}

export function useScoreSync() {
  const onlineStatus = useSyncOnlineStatus();
  const isOnline = onlineStatus === 'online' || onlineStatus === 'syncing';

  const submitScore = useCallback(async (score: ScoreData): Promise<SubmitScoreResult> => {
    if (isOnline) {
      try {
        const supabase = getSupabaseBrowser();
        const { error } = await supabase.rpc('upsert_score_if_newer', {
          p_tournament_id: score.tournament_id,
          p_player_id: score.player_id,
          p_hole_id: score.hole_id,
          p_round_number: score.round_number,
          p_strokes: score.strokes,
          p_updated_at: score.updated_at,
        });

        if (error) {
          throw error;
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: message };
      }
    } else {
      const localId = await saveScoreLocally(score);
      return { success: true, localId };
    }
  }, [isOnline]);

  return {
    isOnline,
    onlineStatus,
    submitScore,
  };
}
