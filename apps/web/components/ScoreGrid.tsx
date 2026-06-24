'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

interface ScoreGridProps {
  tournamentId: string;
  players: Player[];
  holes: Hole[];
  tournamentFormat: 'stroke' | 'stableford' | 'match';
  scoringType: 'gross' | 'net';
  tournamentRounds?: number;
}

export default function ScoreGrid({
  tournamentId,
  players,
  holes,
  tournamentFormat,
  scoringType,
  tournamentRounds = 1,
}: ScoreGridProps) {
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveScheduled = useRef(false);
  const debouncedChanges = useRef<Record<string, number>>({});
  const supabase = getSupabaseBrowser();

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
        .eq('round_number', 1);

      const scoresMap = new Map<string, number>();

      existingScores?.forEach((score) => {
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

    try {
      setIsSaving(true);

      const scoreInserts = [];
      for (const [key, strokes] of scores) {
        const [playerId, holeId] = key.split('-');
        scoreInserts.push({
          tournament_id: tournamentId,
          player_id: playerId,
          hole_id: holeId,
          round_number: 1,
          strokes: strokes,
          recorded_by: (await supabase.auth.getUser()).data.user?.id,
          is_verified: false,
        });
      }

      const { error } = await supabase.from('scores').upsert(scoreInserts, {
        onConflict: 'tournament_id, player_id, hole_id, round_number',
        count: 'exact',
      });

      if (error) {
        console.error('Fout bij opslaan van scores:', error);
        throw error;
      }

      saveScheduled.current = false;
      debouncedChanges.current = {};
      setLastSaved(new Date());
    } catch (error) {
      console.error('Fout bij opslaan:', error);
    } finally {
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
            {sortedPlayers.length} spelers × {sortedHoles.length} holes ronde 1
            {lastSaved && ` • Laatst opgeslagen: ${lastSaved.toLocaleTimeString('nl-NL')}`}
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
                    className="px-3 py-3 text-center text-sm font-medium text-gray-300"
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
                    const strokes = scores.get(key) || (hole.par as number);

                    let cellClass = 'bg-gray-800 border-gray-700';
                    if (tournamentFormat === 'stroke') {
                      cellClass += ` ${getStrokeplayClassification(strokes, hole.par as number)}`;
                    } else if (tournamentFormat === 'stableford') {
                      const points = getStablefordPoints(strokes, hole.par as number);
                      if (points === 0) cellClass += ' text-gray-600';
                      else if (points === 4) cellClass += ' font-bold text-green-400';
                      else cellClass += ' text-green-300';
                    }

                    return (
                      <td key={hole.id} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={strokes}
                          onChange={(e) =>
                            updateScore(
                              player.id,
                              hole.id,
                              parseInt(e.target.value) || 1
                            )
                          }
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
                        const strokes = scores.get(key) || (hole.par as number);
                        const points = getStablefordPoints(strokes, hole.par as number);
                        return sum + (points || 0);
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
            Scores 1-99 • Laatst opgeslagen: {lastSaved?.toLocaleTimeString('nl-NL')}
          </div>
        </div>
      </div>
    </div>
  );
}