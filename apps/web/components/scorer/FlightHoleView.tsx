'use client';

/**
 * FlightHoleView — "Meelopen met flight" modus.
 *
 * Alle spelers van de flight worden gezamenlijk, hole voor hole, ingevoerd.
 * Spelers staan horizontaal naast elkaar (max 4 kolommen) zoals op een
 * fysieke scorekaart-rij. Na opslaan schuift de hele flight samen door naar
 * de volgende hole (auto-advance).
 *
 * Offline-first: score wordt altijd eerst lokaal opgeslagen (IndexedDB),
 * daarna een poging tot directe sync via de conditionele upsert-RPC.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { saveScoreLocally } from '@/lib/offline-db';
import { HoleNavigator } from '@/components/scorer/HoleNavigator';
import { PlayerScoreRow } from '@/components/scorer/PlayerScoreRow';

interface Player {
  id: string;
  name: string;
  handicap?: number | null;
  status: string;
  flight_id?: string;
}

interface Hole {
  id: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
}

interface Props {
  tournamentId: string;
  players: Player[];
  holes: Hole[];
  onBack: () => void;
  onComplete: () => void;
}

const HIGH_SCORE_THRESHOLD: Record<number, number> = { 3: 10, 4: 11, 5: 12 };

export function FlightHoleView({ tournamentId, players, holes, onBack, onComplete }: Props) {
  const t = useTranslations('scorer');

  const sortedHoles = useMemo(() => [...holes].sort((a, b) => a.number - b.number), [holes]);
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name, 'nl')),
    [players]
  );

  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [scoresByHole, setScoresByHole] = useState<Record<string, Record<string, number>>>({});
  const [savedHoles, setSavedHoles] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [pendingHighScore, setPendingHighScore] = useState<{
    playerId: string;
    strokes: number;
  } | null>(null);

  const currentHole = sortedHoles[currentHoleIndex];
  const isLastHole = currentHoleIndex >= sortedHoles.length - 1;

  const currentScores = useMemo(
    () => (currentHole ? (scoresByHole[currentHole.id] ?? {}) : {}),
    [currentHole, scoresByHole]
  );

  const holeStatus: Record<number, 'empty' | 'filled' | 'verified'> = {};
  for (const hole of sortedHoles) {
    holeStatus[hole.number] = savedHoles.has(hole.number) ? 'filled' : 'empty';
  }

  const updateScore = useCallback(
    (playerId: string, strokes: number) => {
      if (!currentHole) return;
      setScoresByHole((prev) => ({
        ...prev,
        [currentHole.id]: {
          ...(prev[currentHole.id] ?? {}),
          [playerId]: strokes,
        },
      }));
    },
    [currentHole]
  );

  const persistHole = useCallback(async () => {
    if (!currentHole) return;
    setSaving(true);
    const now = new Date().toISOString();
    const supabase = getSupabaseBrowser();

    try {
      for (const player of sortedPlayers) {
        const strokes = currentScores[player.id] ?? currentHole.par;

        await saveScoreLocally({
          tournament_id: tournamentId,
          player_id: player.id,
          hole_id: currentHole.id,
          round_number: 1,
          strokes,
          updated_at: now,
        });

        try {
          await supabase.rpc('upsert_score_if_newer', {
            p_tournament_id: tournamentId,
            p_player_id: player.id,
            p_hole_id: currentHole.id,
            p_round_number: 1,
            p_strokes: strokes,
            p_updated_at: now,
          });
        } catch {
          // Offline of netwerkfout — score staat al lokaal, sync-loop pakt dit later op.
        }
      }

      setSavedHoles((prev) => new Set(prev).add(currentHole.number));

      if (isLastHole) {
        onComplete();
      } else {
        setCurrentHoleIndex((prev) => prev + 1);
      }
    } finally {
      setSaving(false);
    }
  }, [currentHole, currentScores, sortedPlayers, tournamentId, isLastHole, onComplete]);

  const handleSaveClick = () => {
    if (!currentHole) return;
    const threshold = HIGH_SCORE_THRESHOLD[currentHole.par] ?? 12;

    const highScorePlayer = sortedPlayers.find((p) => {
      const strokes = currentScores[p.id] ?? currentHole.par;
      return strokes >= threshold;
    });

    if (highScorePlayer && !pendingHighScore) {
      setPendingHighScore({
        playerId: highScorePlayer.id,
        strokes: currentScores[highScorePlayer.id] ?? currentHole.par,
      });
      return;
    }

    setPendingHighScore(null);
    persistHole();
  };

  if (!currentHole) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-6 text-center text-content-muted">
        {t('data_not_found')}
      </div>
    );
  }

  const highScorePlayerName = pendingHighScore
    ? sortedPlayers.find((p) => p.id === pendingHighScore.playerId)?.name
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-content-muted hover:text-content-secondary transition-colors"
        >
          ← {t('back_to_flights')}
        </button>
        <span className="text-sm text-content-muted">
          {sortedPlayers.length} {t('players')}
        </span>
      </div>

      <HoleNavigator
        holes={sortedHoles}
        holeStatus={holeStatus}
        selectedHole={currentHole.number}
        onHoleSelect={(holeNumber) => {
          const idx = sortedHoles.findIndex((h) => h.number === holeNumber);
          if (idx >= 0) setCurrentHoleIndex(idx);
        }}
      />

      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-content-muted">
            Hole {currentHole.number}/{sortedHoles.length} · Par {currentHole.par} · SI{' '}
            {currentHole.stroke_index}
          </span>
          {isLastHole && (
            <span className="text-xs text-green-400 font-medium bg-green-900/30 px-2 py-0.5 rounded-full">
              {t('auto_advance.finished')}
            </span>
          )}
        </div>

        <PlayerScoreRow
          players={sortedPlayers}
          par={currentHole.par}
          scores={currentScores}
          disabled={saving}
          onChange={updateScore}
        />
      </div>

      <button
        onClick={handleSaveClick}
        disabled={saving}
        className="w-full py-4 bg-green-700 text-white text-lg font-semibold rounded-xl
                   hover:bg-green-600 active:scale-98 disabled:opacity-50
                   transition-all touch-manipulation flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Opslaan...
          </>
        ) : isLastHole ? (
          'Laatste hole opslaan →'
        ) : (
          <>{t('auto_advance.next_hole')} →</>
        )}
      </button>

      {pendingHighScore && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-3 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-lg font-semibold text-content mb-2">Hoge score ⚠️</p>
            <p className="text-content-secondary mb-6">
              Je voert {pendingHighScore.strokes} slagen in op een par {currentHole.par} voor{' '}
              {highScorePlayerName}. Klopt dit?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingHighScore(null)}
                className="flex-1 py-3 bg-surface-3 text-content rounded-xl"
              >
                Aanpassen
              </button>
              <button
                onClick={() => {
                  const confirmed = pendingHighScore;
                  setPendingHighScore(null);
                  if (confirmed) persistHole();
                }}
                className="flex-1 py-3 bg-green-700 text-white rounded-xl font-semibold"
              >
                Ja, klopt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
