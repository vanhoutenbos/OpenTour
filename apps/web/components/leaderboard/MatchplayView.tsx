'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  deriveActiveRound,
  getHoleBadgeClass,
  getHoleBadgeLabel,
  getMatchStatus,
  getMatchStatusLabel,
  getRoundLabel,
  getRoundStage,
  getStandingLabel,
  type MatchplayMatch,
} from './matchplayUtils';

interface Props {
  tournamentId: string;
  activeRound?: number | undefined;
}

export function MatchplayView({ tournamentId, activeRound }: Props) {
  const [matches, setMatches] = useState<MatchplayMatch[]>([]);
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

  const summary = useMemo(() => {
    const pending = matches.filter((match) => getMatchStatus(match) === 'pending').length;
    const live = matches.filter((match) => getMatchStatus(match) === 'live').length;
    const finished = matches.filter((match) => getMatchStatus(match) === 'finished').length;
    const rounds = new Set(matches.map((match) => match.round_number));
    return { pending, live, finished, rounds: rounds.size };
  }, [matches]);

  const effectiveActiveRound = useMemo(() => {
    if (activeRound) return activeRound;
    return deriveActiveRound(matches, 99);
  }, [activeRound, matches]);

  const matchesByRound = useMemo(() => {
    const groups = new Map<number, MatchplayMatch[]>();
    matches.forEach((match) => {
      const roundNumber = effectiveActiveRound ?? match.round_number;
      const existing = groups.get(roundNumber) ?? [];
      existing.push(match);
      groups.set(roundNumber, existing);
    });

    const ordered = Array.from(groups.entries()).sort(([a], [b]) => a - b);
    if (effectiveActiveRound) {
      return ordered.filter(([roundNumber]) => roundNumber === effectiveActiveRound);
    }
    return ordered;
  }, [matches, effectiveActiveRound]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-2/80 animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-surface-2/80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-border bg-surface-2/70 p-8 text-center text-content-muted">{error}</div>;
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface-2/60 p-12 text-center text-content-muted">
        Nog geen matchplay wedstrijden beschikbaar.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-2/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-content-muted">Actieve duels</p>
          <p className="mt-2 text-3xl font-semibold text-content">{summary.live}</p>
          <p className="mt-1 text-sm text-content-muted">Matches die op dit moment live zijn.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-content-muted">Nog niet begonnen</p>
          <p className="mt-2 text-3xl font-semibold text-content">{summary.pending}</p>
          <p className="mt-1 text-sm text-content-muted">Wachten op de start van de ronde.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-content-muted">Rondes in beeld</p>
          <p className="mt-2 text-3xl font-semibold text-content">{summary.rounds}</p>
          <p className="mt-1 text-sm text-content-muted">Brackets of rondes zichtbaar in het overzicht.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-2/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-content">Bracket overzicht</h2>
            <p className="text-sm text-content-muted">Elke wedstrijd is zichtbaar als een duidelijk duel met stand, ronde en status.</p>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Matchplay
          </div>
        </div>

        <div className="space-y-5">
          {matchesByRound.map(([roundNumber, roundMatches]) => (
            <section key={roundNumber} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                  getRoundStage(roundNumber, effectiveActiveRound ?? roundNumber) === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : getRoundStage(roundNumber, effectiveActiveRound ?? roundNumber) === 'completed'
                      ? 'border-border-strong bg-surface-3 text-content-secondary'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}>
                  {getRoundLabel(roundNumber)}
                </span>
                <span className="text-sm text-content-muted">{roundMatches.length} duel{roundMatches.length === 1 ? '' : 'en'}</span>
                <span className="text-sm text-content-muted">
                  {getRoundStage(roundNumber, effectiveActiveRound ?? roundNumber) === 'active'
                    ? 'Actief'
                    : getRoundStage(roundNumber, effectiveActiveRound ?? roundNumber) === 'completed'
                      ? 'Afgerond'
                      : 'Komend'}
                </span>
              </div>

              <div className="space-y-3">
                {roundMatches.map((match) => {
                  const status = getMatchStatus(match);
                  const statusLabel = getMatchStatusLabel(match);
                  const standingLabel = getStandingLabel(match);
                  const isAhead = match.standing > 0;
                  const isBehind = match.standing < 0;
                  const isEven = match.standing === 0;

                  return (
                    <article
                      key={`${match.player_a_id}-${match.player_b_id}`}
                      className="rounded-2xl border border-border bg-surface/80 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-border-strong px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-content-muted">
                            {getRoundLabel(match.round_number)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                              status === 'live'
                                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : status === 'finished'
                                  ? 'border border-border-strong bg-surface-3 text-content-secondary'
                                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="text-sm font-medium text-content-muted">
                          {match.holes_played} holes gespeeld
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                        <div className={`rounded-xl border p-3 text-right ${isAhead ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border bg-surface-2/70'}`}>
                          <p className={`text-sm font-semibold ${isAhead ? 'text-content' : 'text-content-secondary'}`}>{match.player_a_name}</p>
                          <p className="mt-1 text-xs text-content-muted">{match.holes_won_a} holes gewonnen</p>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-2/70 px-4 py-3 text-center">
                          <p className={`text-lg font-semibold ${isAhead ? 'text-emerald-300' : isBehind ? 'text-rose-300' : 'text-content-secondary'}`}>
                            {standingLabel}
                          </p>
                          <p className="text-xs uppercase tracking-[0.24em] text-content-muted">Huidige stand</p>
                        </div>

                        <div className={`rounded-xl border p-3 text-left ${isBehind ? 'border-rose-500/30 bg-rose-500/10' : 'border-border bg-surface-2/70'}`}>
                          <p className={`text-sm font-semibold ${isBehind ? 'text-content' : 'text-content-secondary'}`}>{match.player_b_name}</p>
                          <p className="mt-1 text-xs text-content-muted">{match.holes_won_b} holes gewonnen</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {match.hole_results?.map((result, index) => (
                            <span
                              key={`${match.player_a_id}-${index}`}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${getHoleBadgeClass(result)}`}
                              title={`Hole ${index + 1}: ${result === 'A' ? match.player_a_name : result === 'B' ? match.player_b_name : 'Halve'}`}
                            >
                              {getHoleBadgeLabel(result)}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-content-muted">
                          {isEven ? 'Gelijk op dit moment' : `${match.holes_halved} gehalveerd`}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
