import type { LeaderboardEntry, PlayerHoleScore, HoleStat } from '@opentour/types';

const POLL_INTERVAL_MS = 30_000;

export async function fetchLeaderboardData(tournamentId: string): Promise<LeaderboardEntry[]> {
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/api/leaderboard/${tournamentId}`);
      if (res.ok) return res.json();
    } catch {
      // fallthrough naar Supabase
    }
  }

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

export async function fetchPlayerHoleScores(
  tournamentId: string,
  playerId: string
): Promise<PlayerHoleScore[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/player_hole_scores?tournament_id=eq.${tournamentId}&player_id=eq.${playerId}&order=round_number.asc,hole_number.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  });
  if (!res.ok) throw new Error('Spelerscores ophalen mislukt');
  return res.json();
}

export async function fetchCourseHoleStats(tournamentId: string): Promise<HoleStat[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/course_hole_stats?tournament_id=eq.${tournamentId}&order=hole_number.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
  });
  if (!res.ok) throw new Error('Baanstatistieken ophalen mislukt');
  return res.json();
}

export { POLL_INTERVAL_MS };
