'use client';

/**
 * FlightScoreGrid — "Alles onder elkaar" modus voor recorders.
 *
 * Grid-weergave: alle holes van de flight als rijen, alle spelers als kolommen,
 * vrij scrollen en typen (net als de Excel-stijl grid in het organisatorbeheer),
 * maar als eigen recorder-component met het eigen recorder RLS-pad
 * (scores_insert_recorder / scores_update_recorder via geldige toegangscode),
 * niet via de organisator-only policy die de beheerpagina gebruikt.
 *
 * Offline-first: elke wijziging wordt gedebounced en eerst lokaal opgeslagen
 * (IndexedDB) voordat een schrijfpoging naar Supabase wordt gedaan.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useFormatter } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { saveScoreLocally, getPendingScores } from '@/lib/offline-db';

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
  tournamentFormat: 'stroke' | 'stableford' | 'match';
  roundNumber?: number;
  onBack: () => void;
}

function getStrokeplayColorClass(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -2) return 'text-blue-300';
  if (diff === -1) return 'text-blue-400';
  if (diff === 0) return 'text-green-400';
  if (diff === 1) return 'text-yellow-400';
  if (diff === 2) return 'text-orange-400';
  return 'text-red-400';
}

function getStablefordPoints(strokes: number, par: number): number {
  if (strokes <= par - 2) return 4;
  if (strokes === par - 1) return 3;
  if (strokes === par) return 2;
  if (strokes === par + 1) return 1;
  return 0;
}

export function FlightScoreGrid({
  tournamentId,
  players,
  holes,
  tournamentFormat,
  roundNumber = 1,
  onBack,
}: Props) {
  const t = useTranslations('scorer');
  const format = useFormatter();
  const supabase = getSupabaseBrowser();

  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveScheduled = useRef(false);
  const debouncedChanges = useRef<Record<string, number>>({});

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  const sortedHoles = [...holes].sort((a, b) => a.number - b.number);

  useEffect(() => {
    loadInitialScores();

    const saveInterval = setInterval(() => {
      if (saveScheduled.current && Object.keys(debouncedChanges.current).length > 0) {
        saveScores();
      }
    }, 2000);

    return () => clearInterval(saveInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, roundNumber]);

  const loadInitialScores = async () => {
    try {
      setLoading(true);
      const playerIds = sortedPlayers.map((p) => p.id);

      const { data: existingScores } = await supabase
        .from('scores')
        .select('player_id, hole_id, strokes')
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber)
        .in('player_id', playerIds.length > 0 ? playerIds : ['']);

      const scoresMap = new Map<string, number>();

      existingScores?.forEach((score) => {
        scoresMap.set(`${score.player_id}-${score.hole_id}`, score.strokes);
      });

      const pendingScores = await getPendingScores();
      const relevant = pendingScores.filter(
        (s) => s.tournament_id === tournamentId && s.round_number === roundNumber
      );
      const sorted = relevant.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      sorted.forEach((score) => {
        scoresMap.set(`${score.player_id}-${score.hole_id}`, score.strokes);
      });

      setScores(scoresMap);
    } catch (error) {
      console.error('Fout bij laden van scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateScore = useCallback((playerId: string, holeId: string, strokes: number) => {
    const key = `${playerId}-${holeId}`;

    setScores((prev) => {
      const next = new Map(prev);
      next.set(key, strokes);
      return next;
    });

    debouncedChanges.current[key] = strokes;
    saveScheduled.current = true;
  }, []);

  const saveScores = async () => {
    if (!saveScheduled.current) return;

    const changes = { ...debouncedChanges.current };
    if (Object.keys(changes).length === 0) return;

    const now = new Date().toISOString();

    try {
      setIsSaving(true);

      const { data: userData } = await supabase.auth.getUser();
      const recordedBy = userData.user?.id;
      const scoreInserts = [];

      for (const [key, strokes] of Object.entries(changes)) {
        // Keys zijn `${playerId}-${holeId}`, beide UUIDs (36 tekens).
        // Niet splitsen op '-' (UUIDs bevatten zelf '-'); slice op de vaste UUID-grens.
        if (key.length < 73) continue; // 36 + 1 + 36 = 73 minimum
        const playerId = key.slice(0, 36);
        const holeId = key.slice(37);
        scoreInserts.push({
          tournament_id: tournamentId,
          player_id: playerId,
          hole_id: holeId,
          round_number: roundNumber,
          strokes,
          recorded_by: recordedBy,
          is_verified: false,
          updated_at: now,
        });
      }

      const { error } = await supabase.from('scores').upsert(scoreInserts, {
        onConflict: 'tournament_id, player_id, hole_id, round_number',
      });

      if (error) throw error;
    } catch {
      // Offline of schrijffout via directe policy — val terug op lokale opslag,
      // de achtergrond-syncloop (upsert_score_if_newer) pakt dit later op.
      for (const [key, strokes] of Object.entries(changes)) {
        if (key.length < 73) continue;
        const playerId = key.slice(0, 36);
        const holeId = key.slice(37);
        await saveScoreLocally({
          tournament_id: tournamentId,
          player_id: playerId,
          hole_id: holeId,
          round_number: roundNumber,
          strokes,
          updated_at: now,
        });
      }
    } finally {
      saveScheduled.current = false;
      debouncedChanges.current = {};
      setLastSaved(new Date());
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-3 rounded w-1/4"></div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-3 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-content-muted hover:text-content-secondary transition-colors"
        >
          ← {t('back_to_flights')}
        </button>
      </div>

      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="bg-surface-3 px-6 py-4 border-b border-border-strong">
          <h3 className="text-lg font-semibold text-content">Alle holes</h3>
          <p className="text-sm text-content-muted mt-1">
            {sortedPlayers.length} {t('players')} × {sortedHoles.length} {t('holes')}
            {lastSaved &&
              ` • Laatst opgeslagen: ${format.dateTime(lastSaved, { hour: '2-digit', minute: '2-digit' })}`}
            {isSaving && ' • Bezig met opslaan...'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-16 sm:w-20" />
              {sortedPlayers.map((player) => (
                <col key={player.id} className="w-[72px] sm:w-24" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-surface-3 border-b border-border-strong">
                <th className="px-2 py-2 text-left text-xs sm:text-sm font-medium text-content-secondary sticky left-0 bg-surface-3 z-10">
                  Hole
                </th>
                {sortedPlayers.map((player) => (
                  <th
                    key={player.id}
                    className="px-1 py-2 text-center text-xs font-medium text-content-secondary"
                  >
                    <div className="leading-tight truncate" title={player.name}>
                      {player.name}
                    </div>
                    {player.handicap != null && (
                      <div className="text-[10px] text-content-muted leading-tight">
                        HCP {player.handicap}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedHoles.map((hole) => (
                <tr
                  key={hole.id}
                  className="border-b border-border hover:bg-surface-3/50 transition-colors"
                >
                  <td className="px-2 py-1.5 sticky left-0 bg-surface-2 border-r border-border z-10">
                    <div className="font-medium text-content text-sm">{hole.number}</div>
                    <div className="text-[10px] text-content-muted">
                      Par {hole.par} · SI {hole.stroke_index}
                    </div>
                  </td>
                  {sortedPlayers.map((player) => {
                    const key = `${player.id}-${hole.id}`;
                    const strokes = scores.get(key);
                    const hasScore = strokes !== undefined;

                    let cellClass = 'bg-surface-3 border-border-strong text-score-muted';
                    if (hasScore) {
                      if (tournamentFormat === 'stroke') {
                        cellClass = `bg-surface-3 border-border-strong ${getStrokeplayColorClass(strokes!, hole.par as number)}`;
                      } else if (tournamentFormat === 'stableford') {
                        const points = getStablefordPoints(strokes!, hole.par as number);
                        if (points === 0)
                          cellClass = 'bg-surface-3 border-border-strong text-score-muted';
                        else if (points === 4)
                          cellClass = 'bg-surface-3 border-border-strong font-bold text-green-400';
                        else cellClass = 'bg-surface-3 border-border-strong text-green-300';
                      }
                    }

                    return (
                      <td key={player.id} className="px-0.5 py-1 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="99"
                          value={strokes ?? ''}
                          placeholder={String(hole.par)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 99) {
                              updateScore(player.id, hole.id, val);
                            } else if (e.target.value === '') {
                              setScores((prev) => {
                                const next = new Map(prev);
                                next.delete(key);
                                return next;
                              });
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className={`w-full min-w-0 px-0.5 py-1.5 text-center font-mono text-sm rounded border transition-colors ${cellClass} hover:border-green-500 focus:outline-none focus:border-green-400`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-2 border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-content-muted">
            Typ om direct op te slaan • Klik op een vakje om te selecteren
          </div>
          <div className="text-xs text-content-muted">Scores 1-99</div>
        </div>
      </div>
    </div>
  );
}
