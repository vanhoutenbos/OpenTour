'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFormatter } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { saveScoreLocally, getPendingScores } from '@/lib/offline-db';

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

interface ScoreGridProps {
  tournamentId: string;
  players: Player[];
  holes: Hole[];
  tournamentFormat: 'stroke' | 'stableford' | 'match';
  scoringType: 'gross' | 'net';
  tournamentRounds?: number;
  highlightedHole?: number | null;
  currentRound?: number;
}

export default function ScoreGrid({
  tournamentId,
  players,
  holes,
  tournamentFormat,
  scoringType,
  tournamentRounds = 1,
  highlightedHole,
  currentRound = 1,
}: ScoreGridProps) {
  const format = useFormatter();
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveScheduled = useRef(false);
  const debouncedChanges = useRef<Record<string, number>>({});
  const scoresRef = useRef(scores);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const sortedPlayers = [...players].sort((a, b) => {
    const flightA = a.flight_id || '';
    const flightB = b.flight_id || '';
    if (flightA !== flightB) {
      return flightA.localeCompare(flightB);
    }
    return a.name.localeCompare(b.name);
  });

  const sortedHoles = holes.sort((a, b) => a.number - b.number);

  useEffect(() => {
    loadInitialScores();

    const saveInterval = setInterval(() => {
      if (saveScheduled.current && Object.keys(debouncedChanges.current).length > 0) {
        saveScores();
      }
    }, 2000);

    return () => clearInterval(saveInterval);
  }, [tournamentId, players, holes]);

  const loadInitialScores = async () => {
    try {
      setLoading(true);
      const { data: existingScores } = await supabase
        .from('scores')
        .select('player_id, hole_id, strokes')
        .eq('tournament_id', tournamentId)
        .eq('round_number', currentRound);

      const scoresMap = new Map<string, number>();

      existingScores?.forEach((score) => {
        const key = `${score.player_id}-${score.hole_id}`;
        scoresMap.set(key, score.strokes);
      });

      const pendingScores = await getPendingScores();
      const sorted = pendingScores.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      sorted.forEach((score) => {
        const key = `${score.player_id}-${score.hole_id}`;
        scoresMap.set(key, score.strokes);
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
      const newScores = new Map(prev);
      newScores.set(key, strokes);
      return newScores;
    });

    debouncedChanges.current[key] = strokes;
    saveScheduled.current = true;
  }, []);

  const saveScores = async () => {
    if (!saveScheduled.current) return;

    const changes = { ...debouncedChanges.current };
    if (Object.keys(changes).length === 0) return;

    try {
      setIsSaving(true);

      const { data: userData } = await supabase.auth.getUser();
      const recordedBy = userData.user?.id;
      const scoreInserts = [];

      for (const [key, strokes] of Object.entries(changes)) {
        // Keys are formatted as `${playerId}-${holeId}` where both are UUIDs (36 chars each).
        // Splitting on '-' is wrong because UUIDs contain '-' themselves.
        // Instead, slice at the known UUID boundary: first 36 chars = playerId, skip the separator, rest = holeId.
        if (key.length < 73) continue; // 36 + 1 + 36 = 73 minimum
        const playerId = key.slice(0, 36);
        const holeId = key.slice(37);
        scoreInserts.push({
          tournament_id: tournamentId,
          player_id: playerId,
          hole_id: holeId,
          round_number: currentRound,
          strokes,
          recorded_by: recordedBy,
          is_verified: false,
          updated_at: new Date().toISOString(),
        });
      }

      const { error } = await supabase.from('scores').upsert(scoreInserts, {
        onConflict: 'tournament_id, player_id, hole_id, round_number',
      });

      if (error) {
        console.error('Direct upsert mislukt, val terug op offline-db:', error);
        throw error;
      }
    } catch {
      for (const [key, strokes] of Object.entries(changes)) {
        if (key.length < 73) continue;
        const playerId = key.slice(0, 36);
        const holeId = key.slice(37);
        await saveScoreLocally({
          tournament_id: tournamentId,
          player_id: playerId,
          hole_id: holeId,
          round_number: currentRound,
          strokes,
          updated_at: new Date().toISOString(),
        });
      }
    } finally {
      saveScheduled.current = false;
      debouncedChanges.current = {};
      setLastSaved(new Date());
      setIsSaving(false);
    }
  };

  const getPlayerDisplayName = (player: Player) => {
    const handicapText = player.handicap ? ` ${player.handicap}` : '';
    return `${player.name}${handicapText}`;
  };

  const getStrokeplayClassification = (strokes: number, par: number) => {
    const diff = strokes - par;
    if (diff === 0) return 'text-green-400';
    if (diff === -1) return 'text-blue-400';
    if (diff <= -2) return 'text-blue-300';
    if (diff === 1) return 'text-yellow-400';
    if (diff === 2) return 'text-orange-400';
    if (diff >= 3) return 'text-red-400';
    return 'text-white';
  };

  const getStablefordPoints = (strokes: number, par: number) => {
    if (strokes <= par - 2) return 4;
    if (strokes === par - 1) return 3;
    if (strokes === par) return 2;
    if (strokes === par + 1) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/4"></div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Score in Excel-stijl</h3>
          <p className="text-sm text-gray-400 mt-1">
            {sortedPlayers.length} spelers × {sortedHoles.length} holes ronde {currentRound}
            {lastSaved && ` • Laatst opgeslagen: ${format.dateTime(lastSaved, { hour: '2-digit', minute: '2-digit' })}`}
            {isSaving && ' • Bezig met opslaan...'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 sticky left-0 bg-gray-800">
                  Speler
                </th>
                {sortedHoles.map((hole) => (
                  <th
                    key={hole.id}
                    id={`hole-col-${hole.number}`}
                    className={`px-3 py-3 text-center text-sm font-medium transition-colors ${
                      highlightedHole === hole.number
                        ? 'text-green-300 bg-green-900/20'
                        : 'text-gray-300'
                    }`}
                  >
                    <div>Hole {hole.number}</div>
                    <div className="text-xs text-gray-500">Par {hole.par}</div>
                  </th>
                ))}
                {tournamentFormat === 'stableford' && (
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
                    Stableford
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => (
                <tr
                  key={player.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 sticky left-0 bg-gray-900 border-r border-gray-800">
                    <div className="font-medium text-white">{getPlayerDisplayName(player)}</div>
                    <div className="text-xs text-gray-500 capitalize">{player.status}</div>
                  </td>
                  {sortedHoles.map((hole) => {
                    const key = `${player.id}-${hole.id}`;
                    const strokes = scores.get(key);  // undefined = geen score ingevoerd
                    const hasScore = strokes !== undefined;

                    let cellClass = 'bg-gray-800 border-gray-700 text-gray-400';
                    if (hasScore) {
                      if (tournamentFormat === 'stroke') {
                        cellClass = `bg-gray-800 border-gray-700 ${getStrokeplayClassification(strokes!, hole.par as number)}`;
                      } else if (tournamentFormat === 'stableford') {
                        const points = getStablefordPoints(strokes!, hole.par as number);
                        if (points === 0) cellClass = 'bg-gray-800 border-gray-700 text-gray-600';
                        else if (points === 4) cellClass = 'bg-gray-800 border-gray-700 font-bold text-green-400';
                        else cellClass = 'bg-gray-800 border-gray-700 text-green-300';
                      }
                    }

                    return (
                      <td
                        key={hole.id}
                        className={`px-2 py-2 text-center transition-colors ${
                          highlightedHole === hole.number ? 'bg-green-900/10' : ''
                        }`}
                      >
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={strokes ?? ''}
                          placeholder={String(hole.par)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1 && val <= 99) {
                              updateScore(player.id, hole.id, val);
                            } else if (e.target.value === '') {
                              // Lege input: verwijder score uit lokale state maar sla niet op
                              setScores(prev => {
                                const next = new Map(prev);
                                next.delete(`${player.id}-${hole.id}`);
                                return next;
                              });
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className={`w-16 px-2 py-2 text-center font-mono rounded border transition-all ${cellClass} hover:border-green-500 focus:outline-none focus:border-green-400 focus:w-20`}
                        />
                      </td>
                    );
                  })}
                  {tournamentFormat === 'stableford' && (
                    <td className="px-4 py-3 text-center font-mono text-lg">
                      {sortedHoles.reduce((sum, hole) => {
                        const key = `${player.id}-${hole.id}`;
                        const strokes = scores.get(key);
                        if (strokes === undefined) return sum;
                        return sum + getStablefordPoints(strokes, hole.par as number);
                      }, 0)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-400">
            Typ om direct op te slaan • Klik op een vakje om te selecteren
          </div>
          <div className="text-xs text-gray-500">
            Scores 1-99 • Laatst opgeslagen: {lastSaved && format.dateTime(lastSaved, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}