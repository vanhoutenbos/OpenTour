'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ScoreInput } from '@/components/scorer/ScoreInput';
import { HoleNavigator } from '@/components/scorer/HoleNavigator';
import { saveScoreLocally } from '@/lib/offline-db';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

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

interface SavedScore {
  holeNumber: number;
  strokes: number;
}

interface HoleByHoleViewProps {
  tournamentId: string;
  players: Player[];
  holes: Hole[];
  tournament: TournamentInfo;
  locale: string;
  onComplete: () => void;
  onBack: () => void;
}

export function HoleByHoleView({
  tournamentId,
  players,
  holes,
  tournament,
  locale,
  onComplete,
  onBack,
}: HoleByHoleViewProps) {
  const t = useTranslations('scorer');
  const tScoring = useTranslations('scoring');

  const [activePlayerId, setActivePlayerId] = useState<string | null>(
    players.length === 1 ? (players[0]?.id ?? null) : null
  );
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  const [saving, setSaving] = useState(false);

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
  const currentHole = sortedHoles[currentHoleIndex];
  const isLastHole = currentHoleIndex >= sortedHoles.length - 1;
  const activePlayer = players.find((p) => p.id === activePlayerId);

  const previousScore = currentHoleIndex > 0
    ? savedScores.find((s) => s.holeNumber === sortedHoles[currentHoleIndex - 1]?.number)
    : null;

  const holeStatus: Record<number, 'empty' | 'filled' | 'verified'> = {};
  for (const hole of sortedHoles) {
    const saved = savedScores.find((s) => s.holeNumber === hole.number);
    holeStatus[hole.number] = saved ? 'filled' : 'empty';
  }

  const handleSave = useCallback(
    async (strokes: number) => {
      if (!activePlayerId || !currentHole) return;
      setSaving(true);

      try {
        await saveScoreLocally({
          tournament_id: tournamentId,
          player_id: activePlayerId,
          hole_id: currentHole.id,
          round_number: 1,
          strokes,
          updated_at: new Date().toISOString(),
        });

        try {
          const supabase = getSupabaseBrowser();
          await supabase.rpc('upsert_score_if_newer', {
            p_tournament_id: tournamentId,
            p_player_id: activePlayerId,
            p_hole_id: currentHole.id,
            p_round_number: 1,
            p_strokes: strokes,
            p_updated_at: new Date().toISOString(),
          });
        } catch {
          // offline — sync will retry later
        }

        setSavedScores((prev) => [
          ...prev.filter((s) => s.holeNumber !== currentHole.number),
          { holeNumber: currentHole.number, strokes },
        ]);

        if (isLastHole) {
          onComplete();
        } else {
          setCurrentHoleIndex((prev) => prev + 1);
        }
      } finally {
        setSaving(false);
      }
    },
    [activePlayerId, currentHole, tournamentId, isLastHole, onComplete]
  );

  if (!activePlayer || !currentHole) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-content mb-4">{t('mode.follow_flight')}</h3>
        {players.length > 1 && (
          <div className="space-y-3">
            <p className="text-content-muted mb-3">{tScoring('enter_score')}</p>
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => setActivePlayerId(player.id)}
                className="w-full p-4 bg-surface-3 hover:bg-surface-4 text-content rounded-xl
                           text-left transition-colors"
              >
                <span className="font-semibold">{player.name}</span>
                {player.handicap != null && (
                  <span className="text-content-muted ml-2">HCP {player.handicap}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="text-sm text-content-muted hover:text-content-secondary transition-colors"
          >
            ← {t('back_to_flights')}
          </button>
          <span className="text-sm text-content-muted">
            {activePlayer.name}
            {activePlayer.handicap != null && ` · HCP ${activePlayer.handicap}`}
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
      </div>

      {previousScore && (
        <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
          <p className="text-sm text-content-muted">
            {tScoring('hole')} {previousScore.holeNumber}:{' '}
            <span className="text-content font-semibold">{previousScore.strokes}</span>{' '}
            {tScoring('strokes')}
          </p>
        </div>
      )}

      <div className="bg-surface-2 border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-content-muted">
            {tScoring('hole')} {currentHole.number}/{sortedHoles.length}
          </span>
          {isLastHole && (
            <span className="text-xs text-green-400 font-medium bg-green-900/30 px-2 py-0.5 rounded-full">
              {t('auto_advance.finished')}
            </span>
          )}
        </div>

        <ScoreInput
          holeNumber={currentHole.number}
          par={currentHole.par}
          strokeIndex={currentHole.stroke_index}
          currentStrokes={
            savedScores.find((s) => s.holeNumber === currentHole.number)?.strokes ?? null
          }
          onSubmit={handleSave}
          disabled={saving}
        />
      </div>
    </div>
  );
}
