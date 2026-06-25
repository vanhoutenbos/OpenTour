'use client';

import { useState, useEffect } from 'react';

interface Match {
  tournament_id: string;
  round_number: number;
  player_a_id: string;
  player_a_name: string;
  player_b_id: string;
  player_b_name: string;
  holes_won_a: number;
  holes_won_b: number;
  holes_halved: number;
  standing: number;
  holes_played: number;
  standing_text: string;
  hole_results: string[] | null;
}

interface Props {
  tournamentId: string;
}

export function MatchplayView({ tournamentId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/matchplay_standings?tournament_id=eq.${tournamentId}`;
    fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Ophalen mislukt');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setMatches(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Matchplay data niet beschikbaar');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-400">{error}</div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nog geen matchplay wedstrijden
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const isAhead = match.standing > 0;
        const isBehind = match.standing < 0;
        return (
          <div
            key={`${match.player_a_id}-${match.player_b_id}`}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            {/* Stand header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`flex-1 text-right ${isAhead ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  {match.player_a_name}
                </div>
                <div className="text-center shrink-0">
                  <span className={`text-xl font-bold font-mono ${
                    isAhead ? 'text-green-400' : isBehind ? 'text-red-400' : 'text-gray-300'
                  }`}>
                    {match.standing_text}
                  </span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    na {match.holes_played} holes
                  </div>
                </div>
                <div className={`flex-1 text-left ${isBehind ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  {match.player_b_name}
                </div>
              </div>
            </div>

            {/* Hole-by-hole resultaten */}
            {match.hole_results && match.hole_results.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {match.hole_results.map((result, i) => (
                  <span
                    key={i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      result === 'A'
                        ? 'bg-green-900/40 text-green-400 border border-green-700'
                        : result === 'B'
                          ? 'bg-red-900/40 text-red-400 border border-red-700'
                          : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                    title={`Hole ${i + 1}: ${result === 'A' ? match.player_a_name : result === 'B' ? match.player_b_name : 'Halved'}`}
                  >
                    {result === 'A' ? 'A' : result === 'B' ? 'B' : '½'}
                  </span>
                ))}
              </div>
            )}

            {/* Match statistieken */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <span className="text-green-400">{match.player_a_name}: {match.holes_won_a} holes</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">Halved: {match.holes_halved}</span>
              <span className="text-gray-600">|</span>
              <span className="text-red-400">{match.player_b_name}: {match.holes_won_b} holes</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
