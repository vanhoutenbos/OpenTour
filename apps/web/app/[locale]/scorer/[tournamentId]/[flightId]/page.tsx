'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import ScoreGrid from '@/components/score-grid/ScoreGrid';
import { HoleNavigator } from '@/components/scorer/HoleNavigator';
import { SyncStatusBar } from '@/components/scorer/SyncStatusBar';
import {
  getPendingScores,
  markScoreSynced,
  markSyncError,
} from '@/lib/offline-db';

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
  format: 'stroke' | 'stableford' | 'match';
  scoring_type: 'gross' | 'net';
  rounds: number;
}

interface ScoreRow {
  player_id: string;
  hole_id: string;
  is_verified: boolean;
}

type HoleStatus = 'empty' | 'filled' | 'verified';

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
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

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
          supabase
            .from('flights')
            .select('id')
            .eq('id', flightId)
            .single(),
        ]);

        if (cancelled) return;

        if (tournamentRes.error || flightRes.error) {
          setError(t('data_not_found'));
          return;
        }

        const tInfo = tournamentRes.data as TournamentInfo;
        setTournament(tInfo);

        const { data: courseData } = await supabase
          .from('tournaments')
          .select('course_id')
          .eq('id', tournamentId)
          .single();

        if (courseData?.course_id) {
          const { data: holeRows } = await supabase
            .from('holes')
            .select('id, number, par, stroke_index')
            .eq('course_id', courseData.course_id)
            .order('number', { ascending: true });

          if (holeRows) {
            setHoles(holeRows as Hole[]);
          }
        }

        const playerIds = (playersRes.data ?? []).map((p: Player) => p.id);

        if (playerIds.length > 0) {
          const { data: scoreRows } = await supabase
            .from('scores')
            .select('player_id, hole_id, is_verified')
            .eq('tournament_id', tournamentId)
            .eq('round_number', 1)
            .in('player_id', playerIds);

          setScores(scoreRows ?? []);
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

  const handleHoleSelect = useCallback((holeNumber: number) => {
    setSelectedHole((prev) => (prev === holeNumber ? null : holeNumber));
  }, []);

  useEffect(() => {
    if (selectedHole === null) return;
    const el = document.getElementById(`hole-col-${selectedHole}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedHole]);

  const computeHoleStatus = useCallback((): Record<number, HoleStatus> => {
    const status: Record<number, HoleStatus> = {};

    for (const hole of holes) {
      const holeScores = scores.filter((s) => s.hole_id === hole.id);

      if (holeScores.length === 0) {
        status[hole.number] = 'empty';
      } else if (holeScores.every((s) => s.is_verified)) {
        status[hole.number] = 'verified';
      } else {
        status[hole.number] = 'filled';
      }
    }

    return status;
  }, [holes, scores]);

  const holeStatus = computeHoleStatus();

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
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
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
    <main className="min-h-screen bg-gray-950">
      <SyncStatusBar status={syncStatus} pendingCount={pendingCount} />

      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-white">{tournament.name}</h1>
            <p className="text-sm text-gray-400">
              {players.length} {t('players')} · {holes.length} {t('holes')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/scorer/${tournamentId}`}
              className="text-sm text-gray-500 hover:text-gray-300"
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
        {holes.length > 0 && (
          <HoleNavigator
            holes={holes}
            holeStatus={holeStatus}
            selectedHole={selectedHole}
            onHoleSelect={handleHoleSelect}
          />
        )}

        <ScoreGrid
          tournamentId={tournamentId}
          players={players}
          holes={holes}
          tournamentFormat={tournament.format}
          scoringType={tournament.scoring_type}
          tournamentRounds={tournament.rounds}
          highlightedHole={selectedHole}
        />

        <div className="flex justify-center">
          <button
            onClick={() => setShowConfirm(true)}
            className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-semibold
                       text-lg rounded-xl transition-colors min-h-[48px]"
          >
            {t('submit_final')}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-lg font-semibold text-white mb-2">{t('submit_title')}</p>
            <p className="text-gray-300 mb-6">{t('submit_confirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl min-h-[48px]
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
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin" />
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
