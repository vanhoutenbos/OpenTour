'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface Tournament {
  id: string;
  name: string;
  format: string;
  scoring_type: string;
  rounds: number;
  course: { id: string; name: string } | null;
}

interface FlightRow {
  id: string;
  name: string | null;
  start_time: string | null;
  sort_order: number | null;
}

interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
  flight_id: string | null;
}

interface Flight {
  id: string;
  name: string | null;
  sort_order: number | null;
  start_time: string | null;
  players: { id: string; name: string; handicap: number | null }[];
  hole_count: number;
}

export default function TournamentScorerPage() {
  const t = useTranslations('scorer');
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;
  const locale = params.locale as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;

    // Check of de ingelogde user de organisator is van dit toernooi
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: t } = await supabase
        .from('tournaments')
        .select('id')
        .eq('id', tournamentId)
        .eq('created_by', data.user.id)
        .maybeSingle();
      if (t && !cancelled) setIsOrganizer(true);
    });

    const load = async () => {
      try {
        const tournamentRes = await supabase
          .from('tournaments')
          .select('id, name, format, scoring_type, rounds, course:course_id(id, name)')
          .eq('id', tournamentId)
          .single();

        if (cancelled) return;

        if (tournamentRes.error) {
          setError(t('tournament_not_found'));
          setLoading(false);
          return;
        }

        const tData = tournamentRes.data as unknown as Tournament;
        setTournament(tData);

        const flightsRes = await supabase
          .from('flights')
          .select('id, name, start_time, sort_order')
          .eq('tournament_id', tournamentId)
          .order('start_time', { ascending: true, nullsFirst: false });

        if (cancelled) return;

        const flightRows: FlightRow[] = flightsRes.data ?? [];

        if (flightRows.length === 0) {
          setFlights([]);
          setLoading(false);
          return;
        }

        const flightIds = flightRows.map((f) => f.id);

        const playersRes = await supabase
          .from('tournament_players')
          .select('id, name, handicap, flight_id')
          .in('flight_id', flightIds)
          .in('status', ['confirmed', 'registered']);

        const playersByFlight = new Map<string, PlayerRow[]>();
        for (const p of playersRes.data ?? []) {
          const list = playersByFlight.get(p.flight_id!) ?? [];
          list.push(p);
          playersByFlight.set(p.flight_id!, list);
        }

        const holesRes = await supabase
          .from('holes')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', tData.course?.id ?? '');

        const holeCount = holesRes.count ?? 18;

        const flights: Flight[] = flightRows.map((f) => ({
          id: f.id,
          name: f.name,
          sort_order: f.sort_order,
          start_time: f.start_time,
          players: playersByFlight.get(f.id) ?? [],
          hole_count: holeCount,
        }));

        setFlights(flights);
      } catch {
        if (!cancelled) setError(t('load_error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, t]);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-content-muted">Laden...</p>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? t('tournament_not_found')}</p>
          <Link
            href={`/${locale}/scorer`}
            className="text-green-500 hover:text-green-400 underline"
          >
            {t('retry')}
          </Link>
        </div>
      </main>
    );
  }

  const formatLabel =
    tournament.format === 'stableford'
      ? 'Stableford'
      : tournament.format === 'match'
        ? 'Matchplay'
        : 'Strokeplay';

  const scoringLabel = tournament.scoring_type === 'gross' ? 'Bruto' : 'Netto';

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-surface-2 border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-content mb-1">{tournament.name}</h1>
          <p className="text-sm text-content-muted">
            {tournament.course?.name && `${tournament.course.name} · `}
            {formatLabel} · {scoringLabel} · {tournament.rounds} ronde
            {tournament.rounds > 1 ? 'n' : ''}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <Link
              href={`/${locale}/scorer`}
              className="text-sm text-content-muted hover:text-content-secondary"
            >
              {t('other_code')}
            </Link>
            {isOrganizer && (
              <>
                <span className="text-content-secondary">·</span>
                <Link
                  href={`/${locale}/tournament/${tournamentId}/manage`}
                  className="text-sm text-green-600 hover:text-green-400"
                >
                  Beheer →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {flights.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border-strong rounded-2xl">
            <span className="text-5xl">⛳</span>
            <h3 className="text-lg font-semibold text-content mt-4 mb-2">{t('no_flights')}</h3>
            <p className="text-content-muted text-sm">{t('no_flights_desc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => (
              <button
                key={flight.id}
                onClick={() =>
                  router.push(`/${locale}/scorer/${tournamentId}/${flight.id}`)
                }
                className="w-full text-left bg-surface-2 border border-border hover:border-border-strong
                           rounded-2xl p-4 transition-colors min-h-[48px]"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-content">
                      {flight.name ?? `Flight ${flight.sort_order}`}
                    </h3>
                    <p className="text-sm text-content-muted mt-0.5">
                      {flight.start_time &&
                        `${new Date(flight.start_time).toLocaleTimeString(locale === 'nl' ? 'nl-NL' : 'en-GB', { hour: '2-digit', minute: '2-digit' })} · `}
                      {flight.hole_count} {t('holes')} · {flight.players.length} {t('players')}
                    </p>
                    {flight.players.length > 0 && (
                      <p className="text-sm text-content-muted mt-1 truncate">
                        {flight.players.map((p) => p.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-content-muted mt-1 text-lg shrink-0">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
