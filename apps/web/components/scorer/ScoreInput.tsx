'use client';

/**
 * ScoreInput — Score invoer component voor de PWA scorer app
 * - Grote touchdoelen (min 44px) voor gebruik op de baan
 * - Hoog contrast voor buitengebruik
 * - Waarschuwing bij ongebruikelijk hoge score
 */

import { useState } from 'react';

interface Props {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  currentStrokes: number | null;
  onSubmit: (strokes: number) => void;
  onChange?: (strokes: number) => void;
  disabled?: boolean;
  hideSave?: boolean;
}

const HIGH_SCORE_THRESHOLD: Record<number, number> = { 3: 10, 4: 11, 5: 12 };

export function ScoreInput({ holeNumber, par, strokeIndex, currentStrokes, onSubmit, onChange, disabled, hideSave }: Props) {
  const [strokes, setStrokes] = useState<number>(currentStrokes ?? par);
  const [showWarning, setShowWarning] = useState(false);

  const threshold = HIGH_SCORE_THRESHOLD[par] ?? 12;

  const adjust = (delta: number) => {
    setStrokes((prev) => {
      const next = Math.max(1, Math.min(99, prev + delta));
      onChange?.(next);
      return next;
    });
  };

  const handleSubmit = () => {
    if (strokes >= threshold) {
      setShowWarning(true);
      return;
    }
    onSubmit(strokes);
  };

  const confirmHighScore = () => {
    setShowWarning(false);
    onSubmit(strokes);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hole info */}
      <div className="flex justify-between text-sm text-content-muted">
        <span>Hole {holeNumber}</span>
        <span>Par {par}</span>
        <span>SI {strokeIndex}</span>
      </div>

      {/* Score stepper */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => adjust(-1)}
          disabled={disabled || strokes <= 1}
          className="w-16 h-16 rounded-full bg-surface-3 text-3xl font-bold text-content
                     hover:bg-border-strong active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all touch-manipulation"
          aria-label="Eén minder"
        >
          −
        </button>

        <div className="text-center">
          <span className="text-7xl font-bold text-content tabular-nums">{strokes}</span>
          <p className="text-sm text-content-muted mt-1">
            {strokes - par === 0 ? 'Par' :
             strokes - par === -1 ? 'Birdie' :
             strokes - par <= -2 ? 'Eagle 🦅' :
             strokes - par === 1 ? 'Bogey' :
             strokes - par === 2 ? 'Double' :
             `+${strokes - par}`}
          </p>
        </div>

        <button
          onClick={() => adjust(1)}
          disabled={disabled || strokes >= 99}
          className="w-16 h-16 rounded-full bg-surface-3 text-3xl font-bold text-content
                     hover:bg-border-strong active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all touch-manipulation"
          aria-label="Eén meer"
        >
          +
        </button>
      </div>

      {/* Bevestigen */}
      {!hideSave && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-4 bg-green-700 text-white text-lg font-semibold rounded-xl
                     hover:bg-green-600 active:scale-98 disabled:opacity-50
                     transition-all touch-manipulation"
        >
          Opslaan →
        </button>
      )}

      {/* Hoge score waarschuwing */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-3 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-lg font-semibold text-content mb-2">Hoge score ⚠️</p>
            <p className="text-content-secondary mb-6">
              Je voert {strokes} slagen in op een par {par}. Klopt dit?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 py-3 bg-surface-3 text-content rounded-xl"
              >
                Aanpassen
              </button>
              <button
                onClick={confirmHighScore}
                className="flex-1 py-3 bg-green-700 text-white rounded-xl font-semibold"
              >
                Ja, klopt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
