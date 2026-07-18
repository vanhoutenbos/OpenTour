'use client';

import { useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { TeeRecord } from './TeeManagerSection';

export interface LoopSummary {
  id: string;
  name: string;
  loop_type: 'full_18' | 'front_9' | 'back_9' | 'custom';
}

export interface LoopTeeRatingRecord {
  id: string;
  loop_id: string;
  tee_id: string;
  slope_rating: number | null;
  course_rating: number | null;
}

interface LoopRatingsSectionProps {
  loops: LoopSummary[];
  tees: TeeRecord[];
  initialRatings: LoopTeeRatingRecord[];
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Heren',
  female: 'Dames',
  mixed: 'Gemengd',
};

interface CellDraft {
  loopId: string;
  teeId: string;
  slope: string;
  rating: string;
  dirty: boolean;
}

function cellKey(loopId: string, teeId: string): string {
  return `${loopId}::${teeId}`;
}

export function LoopRatingsSection({ loops, tees, initialRatings }: LoopRatingsSectionProps) {
  // Eén draft per (loop, tee) combinatie die daadwerkelijk een override heeft.
  // Combinaties zonder eigen rij tonen de default van `tees` als placeholder.
  const [cells, setCells] = useState<Record<string, CellDraft>>(() => {
    const map: Record<string, CellDraft> = {};
    for (const rating of initialRatings) {
      map[cellKey(rating.loop_id, rating.tee_id)] = {
        loopId: rating.loop_id,
        teeId: rating.tee_id,
        slope: rating.slope_rating?.toString() ?? '',
        rating: rating.course_rating?.toString() ?? '',
        dirty: false,
      };
    }
    return map;
  });

  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeLoopId, setActiveLoopId] = useState<string | null>(loops[0]?.id ?? null);

  // Als de lijst met lussen wijzigt (aanmaken/verwijderen in LoopManagerSection)
  // en de actieve tab bestaat niet meer, val terug op de eerste lus.
  const resolvedActiveLoopId =
    activeLoopId && loops.some((loop) => loop.id === activeLoopId) ? activeLoopId : (loops[0]?.id ?? null);

  const teeLabel = useMemo(
    () => (tee: TeeRecord) => {
      const color = tee.color || tee.name || tee.external_id;
      return tee.gender ? `${color} (${GENDER_LABELS[tee.gender] ?? tee.gender})` : color;
    },
    []
  );

  function validate(slope: string, rating: string, label: string): string | null {
    if (slope.trim() !== '') {
      const n = Number(slope);
      if (!Number.isInteger(n) || n < 55 || n > 155) {
        return `Slope voor ${label} moet een geheel getal zijn tussen 55 en 155.`;
      }
    }
    if (rating.trim() !== '') {
      if (!/^\d{1,3}(\.\d)?$/.test(rating.trim())) {
        return `Course rating voor ${label} moet een getal zijn met maximaal 1 decimaal (bijv. 35.0).`;
      }
    }
    return null;
  }

  function getCell(loopId: string, teeId: string): CellDraft {
    return (
      cells[cellKey(loopId, teeId)] ?? {
        loopId,
        teeId,
        slope: '',
        rating: '',
        dirty: false,
      }
    );
  }

  function updateCell(loopId: string, teeId: string, patch: Partial<CellDraft>) {
    const key = cellKey(loopId, teeId);
    setCells((prev) => ({
      ...prev,
      [key]: { ...getCell(loopId, teeId), ...prev[key], ...patch, dirty: true },
    }));
  }

  async function saveCell(loopId: string, teeId: string, teeLabelText: string) {
    const cell = getCell(loopId, teeId);
    const validationError = validate(cell.slope, cell.rating, teeLabelText);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);
    const key = cellKey(loopId, teeId);
    setSaving(key);

    const supabase = getSupabaseBrowser();

    // Geen van beide waardes ingevuld -> override verwijderen zodat de
    // generieke tees-rating weer als fallback geldt.
    if (cell.slope.trim() === '' && cell.rating.trim() === '') {
      const { error: deleteError } = await supabase
        .from('loop_tee_ratings')
        .delete()
        .eq('loop_id', loopId)
        .eq('tee_id', teeId);

      setSaving(null);
      if (deleteError) {
        setError(`Verwijderen mislukt voor ${teeLabelText}: ${deleteError.message}`);
        return;
      }
      setCells((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSuccess(`Override voor ${teeLabelText} verwijderd — valt terug op de teebox-default.`);
      return;
    }

    const { error: upsertError } = await supabase.from('loop_tee_ratings').upsert(
      {
        loop_id: loopId,
        tee_id: teeId,
        slope_rating: cell.slope.trim() === '' ? null : Number(cell.slope),
        course_rating: cell.rating.trim() === '' ? null : Number(cell.rating),
      },
      { onConflict: 'loop_id,tee_id' }
    );

    setSaving(null);

    if (upsertError) {
      setError(`Opslaan mislukt voor ${teeLabelText}: ${upsertError.message}`);
      return;
    }

    setCells((prev) => ({ ...prev, [key]: { ...cell, dirty: false } }));
    setSuccess(`Rating voor ${teeLabelText} opgeslagen.`);
  }

  if (tees.length === 0 || loops.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-5">
      <div>
        <p className="text-sm font-medium text-content">Slope- &amp; course rating per lus</p>
        <p className="text-xs text-content-muted mt-0.5">
          Dezelfde teebox kan een andere rating hebben afhankelijk van de lus die gespeeld wordt
          (bijv. 18 holes t.o.v. losse voor-9 of achter-9). Laat een veld leeg om de default van de
          teebox te gebruiken.
        </p>
      </div>

      {loops.length > 1 && (
        <div className="border-b border-border">
          <div className="flex gap-4 overflow-x-auto scrollbar-none">
            {loops.map((loop) => (
              <button
                key={loop.id}
                type="button"
                onClick={() => setActiveLoopId(loop.id)}
                className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  resolvedActiveLoopId === loop.id
                    ? 'border-green-500 text-content'
                    : 'border-transparent text-content-muted hover:text-content'
                }`}
              >
                {loop.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loops
          .filter((loop) => loop.id === resolvedActiveLoopId)
          .map((loop) => (
            <div key={loop.id} className="space-y-2">
              {loops.length === 1 && <p className="text-sm font-semibold text-content">{loop.name}</p>}
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-1 text-xs uppercase tracking-wide text-content-muted">
                  <span>Teebox</span>
                  <span className="w-20">Slope</span>
                  <span className="w-24">Course rating</span>
                  <span className="w-16" />
                </div>

                {tees.map((tee) => {
                  const cell = getCell(loop.id, tee.id);
                  const key = cellKey(loop.id, tee.id);
                  const isSaving = saving === key;
                  const label = teeLabel(tee);
                  const defaultSlope = tee.slope_rating?.toString() ?? '—';
                  const defaultRating = tee.course_rating?.toString() ?? '—';

                  return (
                    <div key={tee.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                      <span className="text-sm text-content-secondary truncate">{label}</span>

                      <input
                        type="number"
                        inputMode="numeric"
                        min={55}
                        max={155}
                        step={1}
                        placeholder={defaultSlope}
                        value={cell.slope}
                        onChange={(e) => updateCell(loop.id, tee.id, { slope: e.target.value })}
                        className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                        disabled={isSaving}
                      />

                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={defaultRating}
                        value={cell.rating}
                        onChange={(e) => updateCell(loop.id, tee.id, { rating: e.target.value })}
                        className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                        disabled={isSaving}
                      />

                      <div className="w-16 flex justify-end">
                        {(cell.dirty || cell.slope.trim() !== '' || cell.rating.trim() !== '') && (
                          <button
                            type="button"
                            onClick={() => void saveCell(loop.id, tee.id, `${label} — ${loop.name}`)}
                            disabled={isSaving}
                            className="px-2.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs disabled:opacity-50"
                          >
                            {isSaving ? '…' : 'Sla op'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </div>
  );
}
