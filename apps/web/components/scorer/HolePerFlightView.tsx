'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PlayerScoreRow } from '@/components/scorer/PlayerScoreRow';

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

interface Props {
  tournamentId: string;
  players: Player[];
  holes: Hole[];
  tournamentFormat: 'stroke' | 'stableford' | 'match';
  scoringType: 'gross' | 'net';
  onBack: () => void;
}

type ViewState = 'select_hole' | 'enter_scores' | 'saving' | 'completed';

const HIGH_SCORE_THRESHOLD: Record<number, number> = { 3: 10, 4: 11, 5: 12 };

export function HolePerFlightView({
  tournamentId,
  players,
  holes,
  tournamentFormat,
  scoringType,
  onBack,
}: Props) {
  const t = useTranslations('scorer');
  const supabase = getSupabaseBrowser();

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

  const [viewState, setViewState] = useState<ViewState>('select_hole');
  const [selectedHoleIndex, setSelectedHoleIndex] = useState(0);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [existingScores, setExistingScores] = useState<Map<string, number>>(new Map());
  const [savedHoles, setSavedHoles] = useState<Set<number>>(new Set());
  const [highScoreWarning, setHighScoreWarning] = useState<string | null>(null);

  const currentHole = sortedHoles[selectedHoleIndex];

  useEffect(() => {
    loadExistingScores();
  }, [tournamentId]);

  const loadExistingScores = async () => {
    const playerIds = sortedPlayers.map((p) => p.id);
    if (playerIds.length === 0) return;

    const { data } = await supabase
      .from('scores')
      .select('player_id, hole_id, strokes')
      .eq('tournament_id', tournamentId)
      .eq('round_number', 1)
      .in('player_id', playerIds);

    const map = new Map<string, number>();
    const saved = new Set<number>();

    data?.forEach((s) => {
      const key = `${s.player_id}-${s.hole_id}`;
      map.set(key, s.strokes);
      const hole = sortedHoles.find((h) => h.id === s.hole_id);
      if (hole) saved.add(hole.number);
    });

    setExistingScores(map);
    setSavedHoles(saved);
  };

  const initScoresForHole = useCallback(
    (hole: Hole) => {
      const scores: Record<string, number> = {};
      for (const player of sortedPlayers) {
        const key = `${player.id}-${hole.id}`;
        scores[player.id] = existingScores.get(key) ?? hole.par;
      }
      setPlayerScores(scores);
    },
    [sortedPlayers, existingScores]
  );

  const handleHoleSelect = (index: number) => {
    const hole = sortedHoles[index];
    if (!hole) return;
    setSelectedHoleIndex(index);
    initScoresForHole(hole);
    setViewState('enter_scores');
  };

  const updatePlayerScore = useCallback((playerId: string, strokes: number) => {
    setPlayerScores((prev) => ({ ...prev, [playerId]: strokes }));
  }, []);

  const handleSave = async () => {
    if (!currentHole) return;

    const threshold = HIGH_SCORE_THRESHOLD[currentHole.par] ?? 12;
    const highScorePlayer = sortedPlayers.find((p) => {
      const strokes = playerScores[p.id];
      return strokes != null && strokes >= threshold;
    });

    if (highScorePlayer && !highScoreWarning) {
      setHighScoreWarning(highScorePlayer.id);
      return;
    }

    setViewState('saving');

    try {
      const scoreInserts = sortedPlayers.map((player) => ({
        tournament_id: tournamentId,
        player_id: player.id,
        hole_id: currentHole.id,
        round_number: 1,
        strokes: playerScores[player.id] ?? currentHole.par,
        recorded_by: '',
        is_verified: false,
      }));

      const { error } = await supabase.from('scores').upsert(scoreInserts, {
        onConflict: 'tournament_id, player_id, hole_id, round_number',
        count: 'exact',
      });

      if (error) throw error;

      setSavedHoles((prev) => new Set(prev).add(currentHole.number));
      setHighScoreWarning(null);

      if (selectedHoleIndex < sortedHoles.length - 1) {
        const nextIndex = selectedHoleIndex + 1;
        const nextHole = sortedHoles[nextIndex];
        if (!nextHole) {
          setViewState('completed');
          return;
        }
        setSelectedHoleIndex(nextIndex);
        initScoresForHole(nextHole);
        setViewState('enter_scores');
      } else {
        setViewState('completed');
      }
    } catch {
      setViewState('enter_scores');
    }
  };

  const backToHoleSelect = () => {
    setViewState('select_hole');
    setHighScoreWarning(null);
  };

  if (viewState === 'completed') {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-content mb-2">Alle holes ingevuld</h3>
        <p className="text-content-muted mb-6">Alle scores voor alle holes zijn opgeslagen.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-surface-3 text-content rounded-xl hover:bg-border-strong transition-colors"
          >
            ← {t('back_to_flights')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewState === 'select_hole' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-content">
              {t('hole_per_flight.select_hole')}
            </h3>
            <button
              onClick={onBack}
              className="text-sm text-content-muted hover:text-content-secondary transition-colors"
            >
              ← {t('back_to_flights')}
            </button>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
            {sortedHoles.map((hole, index) => {
              const isSaved = savedHoles.has(hole.number);
              return (
                <button
                  key={hole.id}
                  onClick={() => handleHoleSelect(index)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-h-[56px] ${
                    isSaved
                      ? 'bg-green-900/40 border-green-800 text-green-400'
                      : 'bg-surface-2 border-border text-content-secondary hover:border-green-700 hover:bg-surface-4/50'
                  } active:scale-95`}
                >
                  <span className="font-bold text-sm">{hole.number}</span>
                  <span className="text-[10px] text-content-muted">Par {hole.par}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {viewState !== 'select_hole' && currentHole && (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={backToHoleSelect}
              className="text-sm text-content-muted hover:text-content-secondary transition-colors"
            >
              ← {t('hole_per_flight.select_hole')}
            </button>
            <span className="text-sm text-content-muted">
              Hole {currentHole.number} · Par {currentHole.par} · SI {currentHole.stroke_index}
            </span>
          </div>

          <PlayerScoreRow
            players={sortedPlayers}
            par={currentHole.par}
            scores={playerScores}
            disabled={viewState === 'saving'}
            onChange={updatePlayerScore}
          />

          <button
            onClick={handleSave}
            disabled={viewState === 'saving'}
            className="w-full py-4 bg-green-700 text-white text-lg font-semibold rounded-xl
                       hover:bg-green-600 active:scale-98 disabled:opacity-50
                       transition-all touch-manipulation flex items-center justify-center gap-2"
          >
            {viewState === 'saving' ? (
              <>
                <span
                  className="inline-block w-5 h-5 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin"
                />
                Opslaan...
              </>
            ) : selectedHoleIndex < sortedHoles.length - 1 ? (
              <>{t('hole_per_flight.enter_all')} →</>
            ) : (
              'Laatste hole opslaan →'
            )}
          </button>

          {highScoreWarning && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
              <div className="bg-surface-3 rounded-2xl p-6 max-w-sm w-full">
                <p className="text-lg font-semibold text-content mb-2">Hoge score ⚠️</p>
                <p className="text-content-secondary mb-6">
                  Je voert {playerScores[highScoreWarning]} slagen in op een par {currentHole.par}{' '}
                  voor {sortedPlayers.find((p) => p.id === highScoreWarning)?.name}. Klopt dit?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHighScoreWarning(null)}
                    className="flex-1 py-3 bg-surface-3 text-content rounded-xl"
                  >
                    Aanpassen
                  </button>
                  <button
                    onClick={() => {
                      setHighScoreWarning(null);
                      handleSave();
                    }}
                    className="flex-1 py-3 bg-green-700 text-white rounded-xl font-semibold"
                  >
                    Ja, klopt
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
