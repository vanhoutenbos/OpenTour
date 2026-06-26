'use client';

import { useState, useMemo } from 'react';
import type { LeaderboardEntry } from '@opentour/types';
import { ScorecardModal } from './ScorecardModal';

const INACTIVE_STATUSES = ['dns', 'dnf', 'dsq'];

function formatScore(entry: LeaderboardEntry): string {
  if (INACTIVE_STATUSES.includes(entry.player_status)) return entry.player_status.toUpperCase();
  if (entry.holes_played === 0) return '-';

  if (entry.format === 'stableford') {
    const pts = entry.scoring_type === 'net' ? entry.net_stableford_points : entry.gross_stableford_points;
    return `${pts ?? 0}`;
  }

  const par = entry.scoring_type === 'net' ? entry.net_score_to_par : entry.score_to_par;
  if (par === null || par === undefined) return '-';
  if (par === 0) return 'E';
  return par > 0 ? `+${par}` : `${par}`;
}

function scoreColor(entry: LeaderboardEntry): string {
  if (INACTIVE_STATUSES.includes(entry.player_status)) return 'text-gray-500';
  if (entry.format === 'stableford') return 'text-green-400 font-bold';

  const par = entry.scoring_type === 'net' ? entry.net_score_to_par : entry.score_to_par;
  if (par === null || par === undefined) return 'text-white';
  if (par < 0) return 'text-red-400 font-bold';
  if (par === 0) return 'text-green-400 font-bold';
  return 'text-gray-300';
}

function todayColor(today?: number | null): string {
  if (today === null || today === undefined) return 'text-gray-500';
  if (today < 0) return 'text-red-400';
  if (today === 0) return 'text-green-400';
  return 'text-gray-400';
}

function movementIndicator(prev?: number | null, curr?: number | null) {
  if (prev === undefined || prev === null || curr === undefined || curr === null) {
    return { icon: '—', color: 'text-gray-500', label: 'Ongewijzigd' };
  }
  if (prev === curr) return { icon: '—', color: 'text-gray-500', label: 'Ongewijzigd' };
  if (prev > curr) return { icon: '▲', color: 'text-green-400', label: `Gestegen van ${prev} naar ${curr}` };
  return { icon: '▼', color: 'text-red-400', label: `Gedaald van ${prev} naar ${curr}` };
}

function formatToday(today?: number | null): string {
  if (today === null || today === undefined) return '-';
  if (today === 0) return 'E';
  return today > 0 ? `+${today}` : `${today}`;
}

interface Props {
  entries: LeaderboardEntry[];
  format: string;
  scoringType: string;
  isFavorite: (playerId: string) => boolean;
  onToggleFavorite?: (playerId: string) => void;
  hideFavorites?: boolean;
  searchQuery: string;
  selectedFlight: string;
  showFavoritesOnly: boolean;
  selectedRound: number | null;
  tournamentId: string;
  tournamentRounds: number;
}

export function LeaderboardTable({
  entries,
  format: scoringFormat,
  scoringType,
  isFavorite,
  onToggleFavorite,
  hideFavorites = false,
  searchQuery,
  selectedFlight,
  showFavoritesOnly,
  selectedRound,
  tournamentId,
  tournamentRounds,
}: Props) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...entries];

    // Filter op zoekterm
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.player_name.toLowerCase().includes(q));
    }

    // Filter op flight
    if (selectedFlight) {
      list = list.filter((e) => {
        const order = e.flight_sort_order;
        const name = e.flight_name;
        const key = order != null ? `order:${order}` : `name:${name}`;
        return key === selectedFlight;
      });
    }

    // Filter op favorieten
    if (showFavoritesOnly) {
      list = list.filter((e) => isFavorite(e.player_id));
    }

    // Sorteer: favorieten bovenaan, dan op positie
    list.sort((a, b) => {
      const aFav = isFavorite(a.player_id) ? 0 : 1;
      const bFav = isFavorite(b.player_id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.position - b.position;
    });

    return list;
  }, [entries, searchQuery, selectedFlight, showFavoritesOnly, isFavorite]);

  const hasFavorites = entries.some((e) => isFavorite(e.player_id));

  const roundLabels = useMemo(() => {
    return Array.from({ length: tournamentRounds }, (_, i) => `R${i + 1}`);
  }, [tournamentRounds]);

  // Bepaal of we rondes moeten tonen (minstens 2 en selectedRound = null)
  const showRoundColumns = tournamentRounds > 1 && selectedRound === null;

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Nog geen scores ingevoerd</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-800">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-gray-800 uppercase tracking-wider">
              <th className="pb-3 w-6" />
              <th className="pb-3 pr-2 w-10 text-center">Pos.</th>
              <th className="pb-3 w-6 text-center" />
              <th className="pb-3 text-left pl-2">Speler</th>
              <th className="pb-3 text-center w-14">HCP</th>
              <th className="pb-3 text-center w-14">Thru</th>
              <th className="pb-3 text-center w-20">Vandaag</th>
              {showRoundColumns && roundLabels.map((label) => (
                <th key={label} className="pb-3 text-center w-14">{label}</th>
              ))}
              <th className="pb-3 text-right w-20">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map((entry, index) => {
              const isInactive = INACTIVE_STATUSES.includes(entry.player_status);
              const fav = isFavorite(entry.player_id);
              const mov = movementIndicator(entry.previous_position, entry.position);
              const expanded = expandedPlayer === entry.player_id;
              const isLastFavorite = hasFavorites && fav && index + 1 < filtered.length && !isFavorite(filtered[index + 1]?.player_id ?? '');

              return (
                <tr
                  key={entry.player_id}
                  className={`group cursor-pointer transition-colors ${
                    isInactive
                      ? 'opacity-50'
                      : fav
                        ? 'bg-yellow-900/10 hover:bg-yellow-900/15'
                        : 'hover:bg-gray-800/40'
                  } ${isLastFavorite ? 'border-b-0' : ''}`}
                  onClick={() => setExpandedPlayer(expanded ? null : entry.player_id)}
                >
                  {/* Favoriet ster — alleen op publieke pagina */}
                  {!hideFavorites && (
                    <td className="py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(entry.player_id); }}
                        className={`text-base transition-all hover:scale-110 ${
                          fav ? 'text-yellow-400 drop-shadow-glow' : 'text-gray-600 hover:text-gray-400'
                        }`}
                        title={fav ? 'Uit favorieten' : 'Toevoegen aan favorieten'}
                      >
                        {fav ? '★' : '☆'}
                      </button>
                    </td>
                  )}

                  {/* Positie + movement */}
                  <td className="py-3 pr-2 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {isInactive ? (
                        <span className="text-gray-500 font-mono">—</span>
                      ) : (
                        <>
                          <span className="font-mono font-bold text-white text-sm">
                            {entry.position}
                          </span>
                          <span className={`text-xs ${mov.color}`} title={mov.label}>
                            {mov.icon}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Expander icoon */}
                  <td className="py-3 text-center text-gray-600">
                    <span className={`transition-transform text-xs ${expanded ? 'rotate-180 inline-block' : ''}`}>
                      ▾
                    </span>
                  </td>

                  {/* Speler naam + * */}
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-1.5">
                      {entry.started_on_hole && entry.started_on_hole !== 1 && (
                        <span className="text-gray-500 text-xs font-bold" title={`Gestart op hole ${entry.started_on_hole}`}>
                          *
                        </span>
                      )}
                      <span className={`font-medium truncate max-w-[160px] sm:max-w-[240px] block ${
                        isInactive ? 'text-gray-500 line-through' : 'text-white'
                      }`}>
                        {entry.player_name}
                      </span>
                      {(entry.flight_name || entry.flight_sort_order != null) && (
                        <span className="hidden lg:inline text-xs text-gray-600 ml-1">
                          {entry.flight_name ?? `Flight ${entry.flight_sort_order}`}
                        </span>
                      )}
                      {isInactive && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded uppercase font-bold">
                          {entry.player_status}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* HCP */}
                  <td className="py-3 text-center">
                    <span className="text-gray-400 text-xs font-mono">
                      {entry.handicap !== null && entry.handicap !== undefined ? entry.handicap : '-'}
                    </span>
                  </td>

                  {/* Thru */}
                  <td className="py-3 text-center">
                    <span className="text-gray-400 font-mono text-xs">
                      {isInactive ? '-' : entry.holes_played > 0 ? `${entry.holes_played}` : '-'}
                    </span>
                  </td>

                  {/* Vandaag */}
                  <td className="py-3 text-center">
                    <span className={`font-mono font-bold text-sm ${todayColor(entry.today_score)}`}>
                      {formatToday(entry.today_score)}
                    </span>
                  </td>

                  {/* Per-ronde kolommen */}
                  {showRoundColumns && roundLabels.map((_, i) => {
                    const roundScore = entry.round_scores?.[i] ?? null;
                    const roundPar = entry.round_to_par?.[i] ?? null;
                    return (
                      <td key={i} className="py-3 text-center">
                        <span className={`font-mono text-xs ${roundPar !== null ? (roundPar < 0 ? 'text-red-400' : roundPar > 0 ? 'text-gray-400' : 'text-green-400') : 'text-gray-600'}`}>
                          {roundScore !== null ? roundScore : '-'}
                        </span>
                      </td>
                    );
                  })}

                  {/* Totale score */}
                  <td className={`py-3 text-right font-mono text-base ${scoreColor(entry)}`}>
                    {formatScore(entry)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Uitgeklapte scorecard modals */}
      {expandedPlayer && (
        <ScorecardModal
          playerId={expandedPlayer}
          playerName={entries.find((e) => e.player_id === expandedPlayer)?.player_name ?? ''}
          tournamentId={tournamentId}
          handicap={entries.find((e) => e.player_id === expandedPlayer)?.handicap}
          roundsInTournament={tournamentRounds}
          onClose={() => setExpandedPlayer(null)}
        />
      )}
    </>
  );
}
