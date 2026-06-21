'use client';

import type { LeaderboardEntry, TournamentFormat, ScoringType } from '@opentour/types';

interface Props {
  entries: LeaderboardEntry[];
  format: TournamentFormat;
  scoringType: ScoringType;
}

const INACTIVE_STATUSES = ['dns', 'dnf', 'dsq'];

function getScoreDisplay(entry: LeaderboardEntry, format: TournamentFormat, scoringType: ScoringType): string {
  if (INACTIVE_STATUSES.includes(entry.player_status)) {
    return entry.player_status.toUpperCase();
  }
  if (entry.holes_played === 0) return '-';

  if (format === 'stableford') {
    const pts = scoringType === 'net' ? entry.net_stableford_points : entry.gross_stableford_points;
    return `${pts ?? 0} pts`;
  }

  const par = scoringType === 'net' ? entry.net_score_to_par : entry.score_to_par;
  if (par === null || par === undefined) return '-';
  if (par === 0) return 'E';
  return par > 0 ? `+${par}` : `${par}`;
}

function getScoreClass(entry: LeaderboardEntry, format: TournamentFormat, scoringType: ScoringType): string {
  if (INACTIVE_STATUSES.includes(entry.player_status)) return 'text-gray-500';
  if (format === 'stableford') return 'text-green-400 font-bold';
  const par = scoringType === 'net' ? entry.net_score_to_par : entry.score_to_par;
  if (!par) return 'text-white';
  if (par < 0) return 'text-red-400 font-bold';
  if (par === 0) return 'text-green-400 font-bold';
  return 'text-gray-300';
}

export function LeaderboardTable({ entries, format, scoringType }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nog geen scores ingevoerd
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-800">
            <th className="pb-3 w-12 text-center">Pos.</th>
            <th className="pb-3 pl-2">Speler</th>
            <th className="pb-3 text-center hidden sm:table-cell">Flight</th>
            <th className="pb-3 text-center">Holes</th>
            <th className="pb-3 text-right pr-2">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {entries.map((entry) => {
            const isInactive = INACTIVE_STATUSES.includes(entry.player_status);
            return (
              <tr
                key={entry.player_id}
                className={`py-2 ${isInactive ? 'opacity-50' : 'hover:bg-gray-900'}`}
              >
                <td className="py-3 text-center text-gray-400 font-mono">
                  {isInactive ? '—' : entry.position}
                </td>
                <td className="py-3 pl-2">
                  <span className="font-medium text-white">{entry.player_name}</span>
                  {isInactive && (
                    <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded uppercase">
                      {entry.player_status}
                    </span>
                  )}
                </td>
                <td className="py-3 text-center text-gray-400 hidden sm:table-cell">
                  {entry.flight_name ?? '—'}
                </td>
                <td className="py-3 text-center text-gray-400">
                  {entry.holes_played}/18
                </td>
                <td className={`py-3 text-right pr-2 font-mono ${getScoreClass(entry, format, scoringType)}`}>
                  {getScoreDisplay(entry, format, scoringType)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
