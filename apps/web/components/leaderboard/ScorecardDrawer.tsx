'use client';

import { useState, useEffect } from 'react';
import type { PlayerHoleScore, PlayerRoundDetail } from '@opentour/types';
import { fetchPlayerHoleScores } from '@/lib/fetchLeaderboard';

interface Props {
  playerId: string;
  playerName: string;
  tournamentId: string;
  handicap?: number | undefined;
  roundsInTournament: number;
  /** 'strokeplay' | 'stableford' | 'matchplay' — bepaalt welk getal prominent getoond wordt per vakje */
  format: string;
  onClose: () => void;
}

function groupHolesByRound(holes: PlayerHoleScore[]): PlayerRoundDetail[] {
  const roundMap = new Map<number, PlayerHoleScore[]>();
  for (const hole of holes) {
    const existing = roundMap.get(hole.round_number) ?? [];
    existing.push(hole);
    roundMap.set(hole.round_number, existing);
  }
  const result: PlayerRoundDetail[] = [];
  for (const [roundNumber, roundHoles] of roundMap) {
    const sorted = roundHoles.sort((a, b) => a.hole_number - b.hole_number);
    // Alleen gespeelde holes tellen mee in de totalen — de holes-array bevat nu
    // altijd de volledige loop (ook holes die nog niet gespeeld zijn), dus filteren
    // voorkomt dat "totaal par" de hele ronde pakt terwijl "totaal slagen" alleen
    // de gespeelde holes bevat.
    const played = sorted.filter((h) => h.strokes !== undefined && h.strokes !== null);
    const totalStrokes = played.reduce((sum, h) => sum + (h.strokes ?? 0), 0);
    const totalPar = played.reduce((sum, h) => sum + h.par, 0);
    result.push({
      round_number: roundNumber,
      holes: sorted,
      total_strokes: totalStrokes,
      total_par: totalPar,
      score_to_par: totalStrokes - totalPar,
    });
  }
  return result.sort((a, b) => a.round_number - b.round_number);
}

function getStablefordPoints(strokes: number, par: number): number {
  if (strokes <= par - 2) return 4;
  if (strokes === par - 1) return 3;
  if (strokes === par) return 2;
  if (strokes === par + 1) return 1;
  return 0;
}

function getStablefordColorClass(points: number): string {
  if (points === 0) return 'text-score-muted';
  if (points === 4) return 'font-bold text-green-400';
  return 'text-green-300';
}

/**
 * Eén vakje van de scorekaart.
 * - Strokeplay: aantal slagen prominent in het midden, stableford-punten klein rechtsboven.
 * - Stableford: stableford-punten prominent in het midden, aantal slagen klein rechtsboven.
 * - Matchplay: ongewijzigd, alleen slagen (punten zijn hier niet relevant).
 */
function ScoreSymbol({ strokes, par, isBirdie, isBogey, isEagle, format }: {
  strokes?: number | undefined;
  par: number;
  isBirdie: boolean;
  isBogey: boolean;
  isEagle: boolean;
  format: string;
}) {
  if (strokes === undefined || strokes === null) {
    return <span className="text-content-muted">-</span>;
  }

  const strokesShapeClass = isEagle
    ? 'score-eagle'
    : isBirdie
      ? 'score-birdie'
      : isBogey
        ? 'score-bogey'
        : strokes >= par + 2
          ? 'score-double-bogey'
          : '';

  const strokesColorClass = isEagle
    ? 'text-yellow-400'
    : isBirdie
      ? 'text-red-400'
      : isBogey
        ? 'text-score-muted'
        : strokes >= par + 2
          ? 'text-blue-400'
          : 'text-content';

  const points = getStablefordPoints(strokes, par);
  const showPointsProminent = format === 'stableford';

  const mainValue = showPointsProminent ? points : strokes;
  const mainShapeClass = showPointsProminent ? '' : strokesShapeClass;
  const mainColorClass = showPointsProminent ? getStablefordColorClass(points) : strokesColorClass;

  const cornerValue = showPointsProminent ? strokes : points;

  return (
    <span className="relative inline-flex items-center justify-center w-9 h-9">
      <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-mono font-bold ${mainShapeClass} ${mainColorClass}`}>
        {mainValue}
      </span>
      {format !== 'matchplay' && (
        <span className="absolute top-0 right-0 text-[9px] leading-none font-mono text-content-muted">
          {cornerValue}
        </span>
      )}
    </span>
  );
}

export function ScorecardDrawer({
  playerId,
  playerName,
  tournamentId,
  handicap,
  roundsInTournament,
  format,
  onClose,
}: Props) {
  const [rounds, setRounds] = useState<PlayerRoundDetail[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPlayerHoleScores(tournamentId, playerId)
      .then((data) => {
        if (cancelled) return;
        const grouped = groupHolesByRound(data);
        setRounds(grouped);
        if (grouped.length > 0) {
          setSelectedRound(grouped[grouped.length - 1]!.round_number);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Scorekaart niet beschikbaar');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId, playerId]);

  const active = rounds.find((r) => r.round_number === selectedRound) ?? rounds[rounds.length - 1];

  const splitHoles = (holes: PlayerHoleScore[]) => {
    const front = holes.filter((h) => h.hole_number <= 9);
    const back = holes.filter((h) => h.hole_number > 9);
    return { front, back };
  };

  const renderHoleRow = (
    label: string,
    holes: PlayerHoleScore[],
    renderCell: (hole: PlayerHoleScore) => React.ReactNode
  ) => (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="py-1.5 pr-3 text-xs text-content-muted font-medium w-10">{label}</td>
      {holes.map((h) => (
        <td key={h.hole_number} className="py-1.5 text-center">
          {renderCell(h)}
        </td>
      ))}
      <td className="py-1.5 pl-3 text-right text-xs text-content-muted font-medium" />
    </tr>
  );

  const isPlayed = (h: PlayerHoleScore) => h.strokes !== undefined && h.strokes !== null;
  const totalFront = (holes: PlayerHoleScore[]) =>
    holes.filter((h) => h.hole_number <= 9 && isPlayed(h)).reduce((s, h) => s + (h.strokes ?? 0), 0);
  const totalBack = (holes: PlayerHoleScore[]) =>
    holes.filter((h) => h.hole_number > 9 && isPlayed(h)).reduce((s, h) => s + (h.strokes ?? 0), 0);
  const parFront = (holes: PlayerHoleScore[]) =>
    holes.filter((h) => h.hole_number <= 9 && isPlayed(h)).reduce((s, h) => s + h.par, 0);
  const parBack = (holes: PlayerHoleScore[]) =>
    holes.filter((h) => h.hole_number > 9 && isPlayed(h)).reduce((s, h) => s + h.par, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl bg-surface-2 border-l border-border h-full overflow-y-auto shadow-[0_0_40px_rgba(0,0,0,0.45)] animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2/95 backdrop-blur-sm shrink-0">
          <div>
            <h3 className="text-lg font-bold text-content">{playerName}</h3>
            {handicap !== undefined && (
              <p className="text-xs text-content-muted">HCP {handicap}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-surface-3 hover:bg-surface-4 flex items-center justify-center text-content-muted hover:text-content transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Round tabs */}
        {rounds.length > 1 && (
          <div className="flex gap-1 px-5 py-2 border-b border-border/60 shrink-0">
            {rounds.map((r) => (
              <button
                key={r.round_number}
                onClick={() => setSelectedRound(r.round_number)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedRound === r.round_number
                    ? 'bg-green-600 text-white'
                    : 'bg-surface-3 text-content-muted hover:bg-surface-4'
                }`}
              >
                R{r.round_number}
                {r.score_to_par !== 0 && (
                  <span className={`ml-1 ${r.score_to_par < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.score_to_par > 0 ? `+${r.score_to_par}` : r.score_to_par}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Scorecard */}
        <div className="p-5">
          {loading && (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-surface-3 rounded" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-content-muted">{error}</p>
            </div>
          )}

          {!loading && !error && active && (
            <div className="space-y-6">
              {(() => {
                const { front, back } = splitHoles(active.holes);
                return (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-content-muted text-xs">
                          <th className="text-left font-medium w-10" />
                          {Array.from({ length: 9 }, (_, i) => (
                            <th key={i} className="text-center font-medium w-8">
                              {i + 1}
                            </th>
                          ))}
                          <th className="text-right font-medium w-10 pl-3">OUT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderHoleRow('Par', front, (h) => (
                          <span className="text-xs text-content-muted font-mono">{h.par}</span>
                        ))}
                        {front.some((h) => h.distance_meters) && renderHoleRow('M', front, (h) => (
                          <span className="text-xs text-content-muted font-mono">{h.distance_meters ?? '-'}</span>
                        ))}
                        {renderHoleRow('SI', front, (h) => (
                          <span className="text-xs text-content-muted font-mono">{h.stroke_index}</span>
                        ))}
                        {renderHoleRow('Score', front, (h) => (
                          <ScoreSymbol
                            strokes={h.strokes}
                            par={h.par}
                            isBirdie={h.to_par === -1}
                            isBogey={h.to_par === 1}
                            isEagle={h.to_par != null && h.to_par <= -2}
                            format={format}
                          />
                        ))}
                        <tr className="border-t border-border-strong">
                          <td colSpan={9} className="py-2" />
                          <td className="text-right py-2">
                            <span className="font-mono font-bold text-content">
                              {totalFront(front)}
                            </span>
                            <span className="text-xs text-content-muted ml-1">
                              ({parFront(front)})
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-content-muted text-xs">
                          <th className="text-left font-medium w-10" />
                          {Array.from({ length: 9 }, (_, i) => (
                            <th key={i} className="text-center font-medium w-8">
                              {i + 10}
                            </th>
                          ))}
                          <th className="text-right font-medium w-10 pl-3">IN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderHoleRow('Par', back, (h) => (
                          <span className="text-xs text-content-muted font-mono">{h.par}</span>
                        ))}
                        {back.some((h) => h.distance_meters) && renderHoleRow('M', back, (h) => (
                          <span className="text-xs text-content-muted font-mono">{h.distance_meters ?? '-'}</span>
                        ))}
                        {renderHoleRow('SI', back, (h) => (
                          <span className="text-xs text-content-muted font-mono">{h.stroke_index}</span>
                        ))}
                        {renderHoleRow('Score', back, (h) => (
                          <ScoreSymbol
                            strokes={h.strokes}
                            par={h.par}
                            isBirdie={h.to_par === -1}
                            isBogey={h.to_par === 1}
                            isEagle={h.to_par != null && h.to_par <= -2}
                            format={format}
                          />
                        ))}
                        <tr className="border-t border-border-strong">
                          <td colSpan={9} className="py-2" />
                          <td className="text-right py-2">
                            <span className="font-mono font-bold text-content">
                              {totalBack(back)}
                            </span>
                            <span className="text-xs text-content-muted ml-1">
                              ({parBack(back)})
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* TOTAL row */}
                    <div className="flex items-center justify-between px-1 pt-4 border-t border-border">
                      <span className="text-sm font-bold text-content">Totaal</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-lg text-content">
                          {active.total_strokes}
                        </span>
                        <span className="text-xs text-content-muted mx-1">
                          / {active.total_par}
                        </span>
                        <span className={`font-mono font-bold text-sm ${
                          active.score_to_par < 0
                            ? 'text-red-400'
                            : active.score_to_par === 0
                              ? 'text-green-400'
                              : 'text-content-muted'
                        }`}>
                          {active.score_to_par === 0
                            ? 'E'
                            : active.score_to_par > 0
                              ? `+${active.score_to_par}`
                              : active.score_to_par
                          }
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-content-muted">
                <span><span className="score-eagle inline-block w-5 h-5 text-center leading-5 text-yellow-400 mr-1">◉</span> Eagle</span>
                <span><span className="score-birdie inline-block w-5 h-5 text-center leading-5 text-red-400 mr-1">○</span> Birdie</span>
                <span><span className="text-content mr-1">—</span> Par</span>
                <span><span className="score-bogey inline-block w-5 h-5 text-center leading-5 text-score-muted mr-1">□</span> Bogey</span>
                <span><span className="score-double-bogey inline-block w-5 h-5 text-center leading-5 text-blue-400 mr-1">▫</span> Double+</span>
                <span className="text-content-muted">M = Meters · SI = Stroke Index</span>
                {format === 'stableford' && (
                  <span className="text-content-muted">Klein cijfer rechtsboven = slagen</span>
                )}
                {format === 'strokeplay' && (
                  <span className="text-content-muted">Klein cijfer rechtsboven = stableford-punten</span>
                )}
              </div>

              {/* Stats */}
              {(() => {
                const birdies = active.holes.filter((h) => h.to_par === -1).length;
                const bogeys = active.holes.filter((h) => h.to_par === 1).length;
                const eagles = active.holes.filter((h) => h.to_par != null && h.to_par <= -2).length;
                const pars = active.holes.filter((h) => h.to_par === 0).length;
                return (
                  <div className="flex flex-wrap gap-4 pt-2 text-xs text-content-muted">
                    <span>◎ {eagles} Eagles</span>
                    <span>○ {birdies} Birdies</span>
                    <span>— {pars} Pars</span>
                    <span>□ {bogeys} Bogeys</span>
                  </div>
                );
              })()}
            </div>
          )}

          {!loading && !error && !active && (
            <div className="text-center py-8 text-content-muted">
              Geen scores beschikbaar voor deze speler
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
