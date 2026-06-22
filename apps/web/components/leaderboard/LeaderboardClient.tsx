'use client';

import { useState, useEffect, useCallback } from 'react';
import { LeaderboardTable } from './LeaderboardTable';

interface Props {
  tournamentId: string;
  tournamentName: string;
  format: string;
  scoringType: string;
  isActive: boolean;
}

const POLL_INTERVAL_MS = 30_000;

async function fetchLeaderboard(tournamentId: string) {
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

  // Via Cloudflare Worker (gecached)
  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/api/leaderboard/${tournamentId}`);
      if (res.ok) return res.json();
    } catch {
      // fallthrough naar Supabase direct
    }
  }

  // Fallback: Supabase direct
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tournament_leaderboard?tournament_id=eq.${tournamentId}&order=position.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  });
  if (!res.ok) throw new Error('Leaderboard ophalen mislukt');
  return res.json();
}

export function LeaderboardClient({ tournamentId, format, scoringType, isActive }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
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
      <LeaderboardTable entries={entries} format={format} scoringType={scoringType} />
      {lastUpdated && (
        <p className="text-xs text-gray-500 text-right mt-4">
          Bijgewerkt om {lastUpdated.toLocaleTimeString('nl-NL')}
          {isActive && ' · vernieuwt automatisch'}
        </p>
      )}
    </div>
  );
}
