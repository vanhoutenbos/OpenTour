'use client';

/**
 * PlayerScoreRow — Legt spelers horizontaal naast elkaar (max 4 kolommen per rij).
 * Bij meer dan 4 spelers in een flight (zeldzaam, maar mogelijk bij bijv. team-formats)
 * wordt automatisch naar een volgende rij van max 4 kolommen gewikkeld.
 */

import { PlayerScoreColumn } from '@/components/scorer/PlayerScoreColumn';

interface Player {
  id: string;
  name: string;
  handicap?: number | null;
}

interface Props {
  players: Player[];
  par: number;
  scores: Record<string, number>;
  disabled?: boolean;
  onChange: (playerId: string, strokes: number) => void;
  maxPerRow?: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function PlayerScoreRow({ players, par, scores, disabled, onChange, maxPerRow = 4 }: Props) {
  const rows = chunk(players, maxPerRow);

  return (
    <div className="space-y-3">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
        >
          {row.map((player) => (
            <PlayerScoreColumn
              key={player.id}
              playerName={player.name}
              handicap={player.handicap}
              par={par}
              strokes={scores[player.id] ?? par}
              disabled={disabled}
              onChange={(strokes) => onChange(player.id, strokes)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
