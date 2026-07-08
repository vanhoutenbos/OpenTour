'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type TeeGender = 'male' | 'female' | 'mixed' | null;

export interface TeeRecord {
  id: string;
  external_id: string;
  name: string | null;
  color: string | null;
  slope_rating: number | null;
  course_rating: number | null;
  gender: TeeGender;
}

interface TeeManagerSectionProps {
  courseId: string;
  initialTees: TeeRecord[];
  onTeesChanged?: (tees: TeeRecord[]) => void;
}

const TEE_COLOR_OPTIONS = ['Zwart', 'Wit', 'Geel', 'Blauw', 'Rood', 'Oranje'] as const;
type TeeColor = (typeof TEE_COLOR_OPTIONS)[number];

const GENDER_LABELS: Record<NonNullable<TeeGender>, string> = {
  male: 'Heren',
  female: 'Dames',
  mixed: 'Gemengd',
};

const GENDER_BADGE: Record<NonNullable<TeeGender>, string> = {
  male: 'bg-blue-900/30 text-blue-300 border-blue-700',
  female: 'bg-pink-900/30 text-pink-300 border-pink-700',
  mixed: 'bg-surface-3 text-content-secondary border-border-strong',
};

interface RowDraft {
  id: string;
  label: string;
  color: string | null;
  slope: string;
  rating: string;
  gender: TeeGender;
  dirty: boolean;
}

interface NewTeeDraft {
  color: TeeColor | '';
  gender: TeeGender;
  slope: string;
  rating: string;
}

function toExternalId(color: string): string {
  return color.trim().toLowerCase();
}

export function TeeManagerSection({ courseId, initialTees, onTeesChanged }: TeeManagerSectionProps) {
  const [rows, setRows] = useState<RowDraft[]>(
    initialTees.map((tee) => ({
      id: tee.id,
      label: tee.color || tee.name || tee.external_id,
      color: tee.color,
      slope: tee.slope_rating?.toString() ?? '',
      rating: tee.course_rating?.toString() ?? '',
      gender: tee.gender,
      dirty: false,
    }))
  );

  const [newTee, setNewTee] = useState<NewTeeDraft>({
    color: '',
    gender: null,
    slope: '',
    rating: '',
  });

  const [saving, setSaving] = useState<string | null>(null); // id of row being saved, or 'new', or 'delete-<id>'
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // id to confirm

  // ─── Validate a single row ────────────────────────────────────────────────
  function validateRow(row: Pick<RowDraft, 'slope' | 'rating' | 'label'>): string | null {
    if (row.slope.trim() !== '') {
      const n = Number(row.slope);
      if (!Number.isInteger(n) || n < 55 || n > 155) {
        return `Slope voor ${row.label} moet een geheel getal zijn tussen 55 en 155.`;
      }
    }
    if (row.rating.trim() !== '') {
      if (!/^\d{1,3}(\.\d)?$/.test(row.rating.trim())) {
        return `Course rating voor ${row.label} moet een getal zijn met maximaal 1 decimaal (bijv. 71.4).`;
      }
    }
    return null;
  }

  // ─── Save a single existing tee row ──────────────────────────────────────
  async function saveRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const validationError = validateRow(row);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(rowId);

    const supabase = getSupabaseBrowser();
    const { error: updateError } = await supabase
      .from('tees')
      .update({
        slope_rating: row.slope.trim() === '' ? null : Number(row.slope),
        course_rating: row.rating.trim() === '' ? null : Number(row.rating),
        gender: row.gender ?? null,
      })
      .eq('id', rowId);

    setSaving(null);

    if (updateError) {
      setError(`Opslaan mislukt voor ${row.label}: ${updateError.message}`);
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, dirty: false } : r)));
    setSuccess(`${row.label} opgeslagen.`);
    notifyParent();
  }

  // ─── Delete a tee ─────────────────────────────────────────────────────────
  async function deleteTee(teeId: string) {
    setError(null);
    setSuccess(null);
    setSaving(`delete-${teeId}`);

    const supabase = getSupabaseBrowser();
    const { error: deleteError } = await supabase.from('tees').delete().eq('id', teeId);

    setSaving(null);
    setConfirmDelete(null);

    if (deleteError) {
      setError(`Verwijderen mislukt: ${deleteError.message}`);
      return;
    }

    const removed = rows.find((r) => r.id === teeId);
    setRows((prev) => prev.filter((r) => r.id !== teeId));
    setSuccess(`${removed?.label ?? 'Teebox'} verwijderd.`);
    notifyParent();
  }

  // ─── Add a new tee ────────────────────────────────────────────────────────
  async function addTee() {
    if (!newTee.color) {
      setError('Kies een kleur voor de nieuwe teebox.');
      return;
    }

    const validationError = validateRow({ slope: newTee.slope, rating: newTee.rating, label: newTee.color });
    if (validationError) {
      setError(validationError);
      return;
    }

    const externalId = toExternalId(newTee.color);
    // Allow same color with different gender — combine color + gender as external_id
    const genderSuffix = newTee.gender ? `_${newTee.gender}` : '';
    const candidateExternalId = `${externalId}${genderSuffix}`;

    // Check for duplicate
    if (rows.some((r) => r.id && r.color?.toLowerCase() === externalId && r.gender === newTee.gender)) {
      setError(`Een ${newTee.color} teebox voor ${newTee.gender ? GENDER_LABELS[newTee.gender] : 'ongespecificeerd geslacht'} bestaat al.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving('new');

    const supabase = getSupabaseBrowser();
    const { data, error: insertError } = await supabase
      .from('tees')
      .insert({
        course_id: courseId,
        external_id: candidateExternalId,
        name: newTee.color,
        color: newTee.color,
        gender: newTee.gender ?? null,
        slope_rating: newTee.slope.trim() === '' ? null : Number(newTee.slope),
        course_rating: newTee.rating.trim() === '' ? null : Number(newTee.rating),
      })
      .select('id, external_id, name, color, slope_rating, course_rating, gender')
      .single();

    setSaving(null);

    if (insertError || !data) {
      setError(`Toevoegen mislukt: ${insertError?.message ?? 'Onbekende fout'}`);
      return;
    }

    const addedTee = data as TeeRecord;
    setRows((prev) => [
      ...prev,
      {
        id: addedTee.id,
        label: addedTee.color || addedTee.name || addedTee.external_id,
        color: addedTee.color,
        slope: addedTee.slope_rating?.toString() ?? '',
        rating: addedTee.course_rating?.toString() ?? '',
        gender: addedTee.gender,
        dirty: false,
      },
    ]);

    setNewTee({ color: '', gender: null, slope: '', rating: '' });
    setSuccess(`${addedTee.color} teebox toegevoegd.`);
    notifyParent();
  }

  function notifyParent() {
    if (!onTeesChanged) return;
    onTeesChanged(
      rows.map((r) => ({
        id: r.id,
        external_id: toExternalId(r.color ?? r.label),
        name: r.label,
        color: r.color,
        slope_rating: r.slope ? Number(r.slope) : null,
        course_rating: r.rating ? Number(r.rating) : null,
        gender: r.gender,
      }))
    );
  }

  function updateRow(id: string, patch: Partial<Pick<RowDraft, 'slope' | 'rating' | 'gender'>>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r)));
    setSuccess(null);
  }

  const isSavingNew = saving === 'new';

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-5">
      <div>
        <p className="text-sm font-medium text-content">Teeboxen &amp; WHS-ratings</p>
        <p className="text-xs text-content-muted mt-0.5">
          Elke combinatie van kleur en geslacht heeft zijn eigen slope- en course rating. Hetzelfde tee-kleur
          kan dus twee keer voorkomen — één keer voor heren, één keer voor dames.
        </p>
      </div>

      {/* ─── Existing tees ──────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="text-sm text-content-muted">Nog geen teeboxen. Voeg er een toe hieronder.</p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-1 text-xs uppercase tracking-wide text-content-muted">
            <span>Tee</span>
            <span className="w-24">Geslacht</span>
            <span className="w-20">Slope</span>
            <span className="w-24">Course rating</span>
            <span className="w-20" />
          </div>

          {rows.map((row) => {
            const isDeleting = saving === `delete-${row.id}`;
            const isSavingRow = saving === row.id;
            const pendingDelete = confirmDelete === row.id;

            return (
              <div key={row.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
                {/* Tee label + gender badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-content-secondary truncate">{row.label}</span>
                  {row.gender && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${GENDER_BADGE[row.gender]}`}
                    >
                      {GENDER_LABELS[row.gender]}
                    </span>
                  )}
                </div>

                {/* Gender select */}
                <select
                  value={row.gender ?? ''}
                  onChange={(e) => updateRow(row.id, { gender: (e.target.value as TeeGender) || null })}
                  className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={isSavingRow || isDeleting}
                >
                  <option value="">—</option>
                  <option value="male">Heren</option>
                  <option value="female">Dames</option>
                  <option value="mixed">Gemengd</option>
                </select>

                {/* Slope */}
                <input
                  type="number"
                  inputMode="numeric"
                  min={55}
                  max={155}
                  step={1}
                  placeholder="113"
                  value={row.slope}
                  onChange={(e) => updateRow(row.id, { slope: e.target.value })}
                  className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={isSavingRow || isDeleting}
                />

                {/* Course rating */}
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="71.4"
                  value={row.rating}
                  onChange={(e) => updateRow(row.id, { rating: e.target.value })}
                  className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={isSavingRow || isDeleting}
                />

                {/* Actions */}
                <div className="w-20 flex gap-1.5 justify-end">
                  {row.dirty && (
                    <button
                      type="button"
                      onClick={() => void saveRow(row.id)}
                      disabled={isSavingRow}
                      className="px-2.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs disabled:opacity-50"
                    >
                      {isSavingRow ? '…' : 'Sla op'}
                    </button>
                  )}

                  {!pendingDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(row.id)}
                      disabled={isDeleting}
                      className="px-2.5 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900 text-red-300 text-xs disabled:opacity-50"
                      aria-label={`Verwijder ${row.label}`}
                    >
                      ✕
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => void deleteTee(row.id)}
                        disabled={isDeleting}
                        className="px-2 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs disabled:opacity-50"
                      >
                        {isDeleting ? '…' : 'Ja'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-4 text-content-secondary text-xs"
                      >
                        Nee
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add new tee ────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-border space-y-3">
        <p className="text-xs font-medium text-content-muted uppercase tracking-wide">Teebox toevoegen</p>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
          {/* Color */}
          <div className="space-y-1">
            <label className="text-xs text-content-muted">Kleur *</label>
            <select
              value={newTee.color}
              onChange={(e) => setNewTee((prev) => ({ ...prev, color: e.target.value as TeeColor | '' }))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-content"
              disabled={isSavingNew}
            >
              <option value="">Kies kleur</option>
              {TEE_COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="text-xs text-content-muted">Geslacht</label>
            <select
              value={newTee.gender ?? ''}
              onChange={(e) => setNewTee((prev) => ({ ...prev, gender: (e.target.value as TeeGender) || null }))}
              className="w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-content"
              disabled={isSavingNew}
            >
              <option value="">—</option>
              <option value="male">Heren</option>
              <option value="female">Dames</option>
              <option value="mixed">Gemengd</option>
            </select>
          </div>

          {/* Slope */}
          <div className="space-y-1">
            <label className="text-xs text-content-muted">Slope</label>
            <input
              type="number"
              inputMode="numeric"
              min={55}
              max={155}
              step={1}
              placeholder="113"
              value={newTee.slope}
              onChange={(e) => setNewTee((prev) => ({ ...prev, slope: e.target.value }))}
              className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-content"
              disabled={isSavingNew}
            />
          </div>

          {/* Course rating */}
          <div className="space-y-1">
            <label className="text-xs text-content-muted">Course rating</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="71.4"
              value={newTee.rating}
              onChange={(e) => setNewTee((prev) => ({ ...prev, rating: e.target.value }))}
              className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-content"
              disabled={isSavingNew}
            />
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={() => void addTee()}
            disabled={isSavingNew || !newTee.color}
            className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium self-end"
          >
            {isSavingNew ? 'Toevoegen…' : '+ Teebox'}
          </button>
        </div>
      </div>

      {/* ─── Feedback ───────────────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </div>
  );
}
