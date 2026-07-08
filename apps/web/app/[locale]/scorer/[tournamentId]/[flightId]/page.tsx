'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { SyncStatusBar } from '@/components/scorer/SyncStatusBar';
import { ScoringModeSelector, type ScoringMode } from '@/components/scorer/ScoringModeSelector';
import { FlightHoleView } from '@/components/scorer/FlightHoleView';
import { HolePerFlightView } from '@/components/scorer/HolePerFlightView';
import { FlightScoreGrid } from '@/components/scorer/FlightScoreGrid';
import { getPendingScores, markScoreSynced, markSyncError } from '@/lib/offline-db';

interface Player {
  id: string;
  name: string;
  handicap?: number;
  status: string;
  flight_id?: string;
}

interface Hole {
  id: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
}

interface TournamentInfo {
  name: string;
  format: 'strokeplay' | 'stableford' | 'matchplay';
  scoring_type: 'gross' | 'net';
  rounds: number;
}

export default function FlightScorePage() {
  const t = useTranslations('scorer');
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.tournamentId as string;
  const flightId = params.flightId as string;
  const locale = params.locale as string;

  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>(
    'synced'
  );
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [scoringMode, setScoringMode] = useState<ScoringMode | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;

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
        const [tournamentRes, playersRes, flightRes] = await Promise.all([
          supabase
            .from('tournaments')
            .select('name, format, scoring_type, rounds')
            .eq('id', tournamentId)
            .single(),
          supabase
            .from('tournament_players')
            .select('id, name, handicap, status, flight_id')
            .eq('flight_id', flightId)
            .in('status', ['confirmed', 'registered']),
          supabase.from('flights').select('id').eq('id', flightId).single(),
        ]);

        if (cancelled) return;

        if (tournamentRes.error || flightRes.error) {
          setError(t('data_not_found'));
          return;
        }

        const tInfo = tournamentRes.data as TournamentInfo;
        setTournament(tInfo);

        // Scores verwijzen naar tournament_holes (bevroren bij activatie van het toernooi),
        // niet naar de live holes-tabel — zo blijft par/SI kloppen ook als de baan later wijzigt.
        const { data: holeRows } = await supabase
          .from('tournament_holes')
          .select('id, number, par, stroke_index')
          .eq('tournament_id', tournamentId)
          .order('number', { ascending: true });

        if (holeRows) {
          setHoles(holeRows as Hole[]);
        }

        setPlayers(playersRes.data ?? []);
      } catch {
        if (!cancelled) setError(t('load_error_generic'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, flightId, t]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setSyncStatus('syncing');
    };
    const handleOffline = () => {
      setOnline(false);
      setSyncStatus('offline');
    };

    setOnline(navigator.onLine);
    setSyncStatus(navigator.onLine ? 'synced' : 'offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const check = async () => {
      const pending = await getPendingScores();
      setPendingCount(pending.length);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    const syncPending = async () => {
      setSyncStatus('syncing');
      try {
        const pending = await getPendingScores();
        if (pending.length === 0) {
          if (!cancelled) setSyncStatus('synced');
          return;
        }

        const supabase = getSupabaseBrowser();
        let hasError = false;

        for (const score of pending) {
          const { error } = await supabase.rpc('upsert_score_if_newer', {
            p_tournament_id: score.tournament_id,
            p_player_id: score.player_id,
            p_hole_id: score.hole_id,
            p_round_number: score.round_number,
            p_strokes: score.strokes,
            p_updated_at: score.updated_at,
          });

          if (error) {
            hasError = true;
            await markSyncError(score.localId, error.message);
          } else {
            await markScoreSynced(score.localId);
          }
        }

        if (!cancelled) {
          setSyncStatus(hasError ? 'error' : 'synced');
          const remaining = await getPendingScores();
          setPendingCount(remaining.length);
        }
      } catch {
        if (!cancelled) setSyncStatus('error');
      }
    };

    syncPending();
    return () => {
      cancelled = true;
    };
  }, [online]);

  const handleSubmitFinal = useCallback(async () => {
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from('scores')
        .update({ is_verified: true })
        .eq('tournament_id', tournamentId)
        .in(
          'player_id',
          players.map((p) => p.id)
        )
        .eq('round_number', 1);

      if (error) throw error;

      setShowConfirm(false);
      router.push(`/${locale}/scorer/${tournamentId}`);
    } catch {
      setError(t('submit_error'));
    } finally {
      setSubmitting(false);
    }
  }, [tournamentId, players, router, locale, t]);

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
          <p className="text-red-400 mb-4">{error ?? t('data_not_found')}</p>
          <Link
            href={`/${locale}/scorer/${tournamentId}`}
            className="text-green-500 hover:text-green-400 underline"
          >
            {t('back_to_flights')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <SyncStatusBar status={syncStatus} pendingCount={pendingCount} />

      <div className="bg-surface-2 border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-content">{tournament.name}</h1>
            <p className="text-sm text-content-muted">
              {players.length} {t('players')} · {holes.length} {t('holes')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/scorer/${tournamentId}`}
              className="text-sm text-content-muted hover:text-content-secondary"
            >
              {t('back_to_flights')}
            </Link>
            {isOrganizer && (
              <Link
                href={`/${locale}/tournament/${tournamentId}/manage`}
                className="text-sm text-green-600 hover:text-green-400"
              >
                Beheer →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {scoringMode === null && <ScoringModeSelector onSelect={setScoringMode} />}

        {scoringMode === 'follow' && (
          <FlightHoleView
            tournamentId={tournamentId}
            players={players}
            holes={holes}
            onBack={() => setScoringMode(null)}
            onComplete={() => setShowConfirm(true)}
          />
        )}

        {scoringMode === 'holes_per_flight' && (
          <HolePerFlightView
            tournamentId={tournamentId}
            players={players}
            holes={holes}
            tournamentFormat={tournament.format}
            scoringType={tournament.scoring_type}
            onBack={() => setScoringMode(null)}
          />
        )}

        {scoringMode === 'grid' && (
          <FlightScoreGrid
            tournamentId={tournamentId}
            players={players}
            holes={holes}
            tournamentFormat={tournament.format}
            roundNumber={1}
            onBack={() => setScoringMode(null)}
          />
        )}

        {scoringMode !== null && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowConfirm(true)}
              className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-semibold
                         text-lg rounded-xl transition-colors min-h-[48px]"
            >
              {t('submit_final')}
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-3 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-lg font-semibold text-content mb-2">{t('submit_title')}</p>
            <p className="text-content-secondary mb-6">{t('submit_confirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-3 bg-surface-3 text-content rounded-xl min-h-[48px]
                           disabled:opacity-50"
              >
                {t('submit_cancel')}
              </button>
              <button
                onClick={handleSubmitFinal}
                disabled={submitting}
                className="flex-1 py-3 bg-green-700 text-white rounded-xl font-semibold
                           min-h-[48px] disabled:opacity-50 flex items-center justify-center"
              >
                {submitting ? (
                  <span
                    className="inline-block w-5 h-5 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin"
                  />
                ) : (
                  t('submit_processing')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
