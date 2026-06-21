'use client';

/**
 * LeaderboardClient — polling + weergave
 * Poll elke 30 seconden via Cloudflare Worker (gecached)
 * Fallback naar Supabase direct als Worker niet beschikbaar is
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchLeaderboard } from '@opentour/supabase';
import { LeaderboardTable } from './LeaderboardTable';
import type { LeaderboardEntry, Tournament } from '@opentour/types';

interface Props {
  tournamentId: string;
  tournament: Tournament;
  isActive: boolean;
}

const POLL_INTERVAL_MS = 30_000;

export function LeaderboardClient({ tournamentId, tournament, isActive }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await fetchLeaderboard(tournamentId);
      setEntries(data ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Leaderboard tijdelijk niet beschikbaar');
    }
  }, [tournamentId]);

  useEffect(() => {
    poll();
    if (!isActive) return;

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll, isActive]);

  if (error) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>{error}</p>
        <button
          onClick={poll}
          className="mt-4 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  return (
    <div>
      <LeaderboardTable entries={entries} format={tournament.format} scoringType={tournament.scoring_type} />
      {lastUpdated && (
        <p className="text-xs text-gray-500 text-right mt-4">
          Bijgewerkt om {lastUpdated.toLocaleTimeString('nl-NL')}
          {isActive && ' · vernieuwt automatisch'}
        </p>
      )}
    </div>
  );
}
