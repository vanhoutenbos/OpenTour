'use client';

import { useEffect, useMemo, useState } from 'react';
import {
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

  const matchesByRound = useMemo(() => {
    const groups = new Map<number, MatchplayMatch[]>();
    matches.forEach((match) => {
      const roundNumber = activeRound ?? match.round_number;
      const existing = groups.get(roundNumber) ?? [];
      existing.push(match);
      groups.set(roundNumber, existing);
    });

    const ordered = Array.from(groups.entries()).sort(([a], [b]) => a - b);
    if (activeRound) {
      return ordered.filter(([roundNumber]) => roundNumber === activeRound);
    }
    return ordered;
  }, [matches, activeRound]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900/80 animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-900/80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">{error}</div>;
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center text-slate-500">
        Nog geen matchplay wedstrijden beschikbaar.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Actieve duels</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.live}</p>
          <p className="mt-1 text-sm text-slate-400">Matches die op dit moment live zijn.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Nog niet begonnen</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.pending}</p>
          <p className="mt-1 text-sm text-slate-400">Wachten op de start van de ronde.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rondes in beeld</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.rounds}</p>
          <p className="mt-1 text-sm text-slate-400">Brackets of rondes zichtbaar in het overzicht.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Bracket overzicht</h2>
            <p className="text-sm text-slate-400">Elke wedstrijd is zichtbaar als een duidelijk duel met stand, ronde en status.</p>
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
                  getRoundStage(roundNumber, activeRound ?? roundNumber) === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : getRoundStage(roundNumber, activeRound ?? roundNumber) === 'completed'
                      ? 'border-slate-700 bg-slate-800 text-slate-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}>
                  {getRoundLabel(roundNumber)}
                </span>
                <span className="text-sm text-slate-500">{roundMatches.length} duel{roundMatches.length === 1 ? '' : 'en'}</span>
                <span className="text-sm text-slate-500">
                  {getRoundStage(roundNumber, activeRound ?? roundNumber) === 'active'
                    ? 'Actief'
                    : getRoundStage(roundNumber, activeRound ?? roundNumber) === 'completed'
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
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {getRoundLabel(match.round_number)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                              status === 'live'
                                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : status === 'finished'
                                  ? 'border border-slate-700 bg-slate-800 text-slate-300'
                                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="text-sm font-medium text-slate-400">
                          {match.holes_played} holes gespeeld
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                        <div className={`rounded-xl border p-3 text-right ${isAhead ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70'}`}>
                          <p className={`text-sm font-semibold ${isAhead ? 'text-white' : 'text-slate-300'}`}>{match.player_a_name}</p>
                          <p className="mt-1 text-xs text-slate-400">{match.holes_won_a} holes gewonnen</p>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-center">
                          <p className={`text-lg font-semibold ${isAhead ? 'text-emerald-300' : isBehind ? 'text-rose-300' : 'text-slate-200'}`}>
                            {standingLabel}
                          </p>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Huidige stand</p>
                        </div>

                        <div className={`rounded-xl border p-3 text-left ${isBehind ? 'border-rose-500/30 bg-rose-500/10' : 'border-slate-800 bg-slate-900/70'}`}>
                          <p className={`text-sm font-semibold ${isBehind ? 'text-white' : 'text-slate-300'}`}>{match.player_b_name}</p>
                          <p className="mt-1 text-xs text-slate-400">{match.holes_won_b} holes gewonnen</p>
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
                        <div className="text-sm text-slate-400">
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
