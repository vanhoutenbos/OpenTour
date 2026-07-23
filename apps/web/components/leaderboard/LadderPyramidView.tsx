'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPyramids, formatDeadline, type LadderStandingEntry } from './ladderUtils';

const POLL_INTERVAL_MS = 30_000;

interface Props {
  tournamentId: string;
}

export function LadderPyramidView({ tournamentId }: Props) {
  const [entries, setEntries] = useState<LadderStandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movedPlayerIds, setMovedPlayerIds] = useState<Set<string>>(new Set());
  const prevRungRef = useRef<Map<string, number>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ladder_standings?tournament_id=eq.${tournamentId}`;
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
        .then((data: LadderStandingEntry[]) => {
          if (cancelled) return;

          // Detecteer welke spelers sinds de vorige poll van trede zijn gewisseld,
          // voor de korte highlight-animatie op hun kaart (§9.3 van het analyseplan).
          const moved = new Set<string>();
          data.forEach((entry) => {
            const prevRung = prevRungRef.current.get(entry.tournament_player_id);
            if (prevRung !== undefined && prevRung !== entry.rung_number) {
              moved.add(entry.tournament_player_id);
            }
          });
          prevRungRef.current = new Map(data.map((e) => [e.tournament_player_id, e.rung_number]));

          if (moved.size > 0) {
            setMovedPlayerIds(moved);
            setTimeout(() => setMovedPlayerIds(new Set()), 2000);
          }

          setEntries(data ?? []);
          setLoading(false);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError('Piramide tijdelijk niet beschikbaar');
          setLoading(false);
        });
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tournamentId]);

  const pyramids = useMemo(() => buildPyramids(entries), [entries]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-2/80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-border bg-surface-2/70 p-8 text-center text-content-muted">{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface-2/60 p-12 text-center text-content-muted">
        De piramide is nog niet ingedeeld.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pyramids.map((pyramid) => (
        <section key={pyramid.categoryId ?? 'gemengd'} className="rounded-2xl border border-border bg-surface-2/70 p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-content">
              {pyramid.categoryName ?? 'Piramide'}
            </h2>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
              Ladder
            </div>
          </div>

          <div className="space-y-4">
            {pyramid.rungs.map((rung) => (
              <div key={rung.rungNumber} className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.24em] text-content-muted">
                  Trede {rung.rungNumber}
                </span>
                <div className="flex flex-wrap justify-center gap-3">
                  {rung.entries.map((entry) => (
                    <PlayerCard
                      key={entry.tournament_player_id}
                      entry={entry}
                      justMoved={movedPlayerIds.has(entry.tournament_player_id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlayerCard({ entry, justMoved }: { entry: LadderStandingEntry; justMoved: boolean }) {
  const hasChallenge = entry.active_challenge_id !== null;

  return (
    <article
      className={`w-full min-w-[220px] max-w-[260px] rounded-xl border p-3 shadow-sm transition-all duration-700 ${
        justMoved
          ? 'border-emerald-500/50 bg-emerald-500/10 scale-[1.03]'
          : 'border-border bg-surface/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-content">{entry.player_name}</p>
        <span className="shrink-0 text-xs text-content-muted">#{entry.position_in_rung}</span>
      </div>
      {entry.handicap !== null && (
        <p className="mt-0.5 text-xs text-content-muted">hcp {entry.handicap}</p>
      )}

      {hasChallenge && (
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
            {entry.active_challenge_role === 'challenger' ? 'Daagt uit' : 'Uitgedaagd door'}
          </p>
          <p className="text-xs text-content-secondary">
            {entry.active_challenge_opponent_name}
            {entry.active_challenge_deadline && (
              <> &middot; {formatDeadline(entry.active_challenge_deadline)}</>
            )}
          </p>
        </div>
      )}
    </article>
  );
}
