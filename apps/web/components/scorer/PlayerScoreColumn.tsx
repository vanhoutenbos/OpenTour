'use client';

/**
 * PlayerScoreColumn — Compact per-player score control voor horizontale layouts.
 * Gebruikt in FlightHoleView (meelopen) en HolePerFlightView (holes per flight),
 * waar tot 4 spelers naast elkaar staan voor dezelfde hole.
 *
 * Invoer: +/- stepper plus een tikbaar cijfer dat verandert in een editable
 * invoerveld (numeriek toetsenbord op mobiel via inputMode="numeric").
 */

import { useState, useEffect, useRef } from 'react';

interface Props {
  playerName: string;
  handicap?: number | null | undefined;
  strokes: number;
  par: number;
  disabled?: boolean | undefined;
  onChange: (strokes: number) => void;
}

function getScoreLabel(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff === 0) return 'Par';
  if (diff === -1) return 'Birdie';
  if (diff <= -2) return 'Eagle';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function getScoreColorClass(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -2) return 'text-blue-300';
  if (diff === -1) return 'text-blue-400';
  if (diff === 0) return 'text-green-400';
  if (diff === 1) return 'text-yellow-400';
  if (diff === 2) return 'text-orange-400';
  return 'text-red-400';
}

export function PlayerScoreColumn({
  playerName,
  handicap,
  strokes,
  par,
  disabled,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(strokes));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(strokes));
  }, [strokes, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const adjust = (delta: number) => {
    const next = Math.max(1, Math.min(99, strokes + delta));
    onChange(next);
  };

  const commitDraft = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
      onChange(parsed);
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-2 bg-surface-2 border border-border rounded-xl p-3 min-w-0">
      <p
        className="text-xs font-medium text-content text-center leading-tight truncate w-full"
        title={playerName}
      >
        {playerName}
      </p>
      {handicap != null && (
        <p className="text-[10px] text-content-muted leading-none">HCP {handicap}</p>
      )}

      <button
        type="button"
        onClick={() => adjust(-1)}
        disabled={disabled || strokes <= 1}
        aria-label={`Eén minder voor ${playerName}`}
        className="w-11 h-11 rounded-full bg-surface-3 text-2xl font-bold text-content
                   hover:bg-border-strong active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                   transition-all touch-manipulation"
      >
        −
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
            if (e.key === 'Escape') {
              setDraft(String(strokes));
              setEditing(false);
            }
          }}
          className="w-16 text-center text-3xl font-bold tabular-nums bg-surface-3 border border-green-600
                     rounded-lg py-1 text-content focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setEditing(true)}
          disabled={disabled}
          className="w-16 text-center touch-manipulation disabled:cursor-not-allowed"
          aria-label={`Score aanpassen voor ${playerName}, huidig ${strokes}`}
        >
          <span className={`text-4xl font-bold tabular-nums ${getScoreColorClass(strokes, par)}`}>
            {strokes}
          </span>
        </button>
      )}

      <p className="text-[10px] text-content-muted leading-none min-h-[12px]">
        {getScoreLabel(strokes, par)}
      </p>

      <button
        type="button"
        onClick={() => adjust(1)}
        disabled={disabled || strokes >= 99}
        aria-label={`Eén meer voor ${playerName}`}
        className="w-11 h-11 rounded-full bg-surface-3 text-2xl font-bold text-content
                   hover:bg-border-strong active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                   transition-all touch-manipulation"
      >
        +
      </button>
    </div>
  );
}
