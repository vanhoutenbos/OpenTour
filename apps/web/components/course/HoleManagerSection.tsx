'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export interface HoleRecord {
  id: string;
  number: number;
  par: number;
  stroke_index: number;
  distance_meters: number | null;
}

interface HoleManagerSectionProps {
  courseId: string;
  initialHoles: HoleRecord[];
  onHolesChanged?: (holes: HoleRecord[]) => void;
}

interface RowDraft {
  id: string;
  number: string;
  par: string;
  stroke_index: string;
  distance_meters: string;
  dirty: boolean;
}

interface NewHoleDraft {
  number: string;
  par: string;
  stroke_index: string;
  distance_meters: string;
}

function toRowDraft(hole: HoleRecord): RowDraft {
  return {
    id: hole.id,
    number: String(hole.number),
    par: String(hole.par),
    stroke_index: String(hole.stroke_index),
    distance_meters: hole.distance_meters?.toString() ?? '',
    dirty: false,
  };
}

function sortByNumber(holes: HoleRecord[]): HoleRecord[] {
  return [...holes].sort((a, b) => a.number - b.number);
}

function nextDefaults(holes: HoleRecord[]): NewHoleDraft {
  const usedNumbers = new Set(holes.map((h) => h.number));
  const usedSi = new Set(holes.map((h) => h.stroke_index));
  let n = 1;
  while (usedNumbers.has(n)) n += 1;
  let si = 1;
  while (usedSi.has(si) && si <= 18) si += 1;
  return {
    number: String(n),
    par: '4',
    stroke_index: si <= 18 ? String(si) : '',
    distance_meters: '',
  };
}

export function HoleManagerSection({ courseId, initialHoles, onHolesChanged }: HoleManagerSectionProps) {
  const [holes, setHoles] = useState<HoleRecord[]>(sortByNumber(initialHoles));
  const [rows, setRows] = useState<RowDraft[]>(sortByNumber(initialHoles).map(toRowDraft));
  const [newHole, setNewHole] = useState<NewHoleDraft>(nextDefaults(initialHoles));

  const [saving, setSaving] = useState<string | null>(null); // id, 'new', or 'delete-<id>'
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function notifyParent(next: HoleRecord[]) {
    setHoles(next);
    onHolesChanged?.(next);
  }

  function updateRow(id: string, patch: Partial<Omit<RowDraft, 'id' | 'dirty'>>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r)));
  }

  function validateFields(fields: { number: string; par: string; stroke_index: string; distance_meters: string }): string | null {
    const number = Number(fields.number);
    if (!Number.isInteger(number) || number < 1) {
      return 'Holenummer moet een geheel getal groter dan 0 zijn.';
    }
    const par = Number(fields.par);
    if (![3, 4, 5].includes(par)) {
      return 'Par moet 3, 4 of 5 zijn.';
    }
    const si = Number(fields.stroke_index);
    if (!Number.isInteger(si) || si < 1 || si > 18) {
      return 'Stroke index moet een geheel getal tussen 1 en 18 zijn.';
    }
    if (fields.distance_meters.trim() !== '') {
      const distance = Number(fields.distance_meters);
      if (!Number.isInteger(distance) || distance < 0) {
        return 'Afstand moet een positief geheel getal zijn.';
      }
    }
    return null;
  }

  // ─── Save a single existing hole (renumber-safe via update_hole RPC) ────
  async function saveRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const validationError = validateFields(row);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(rowId);

    const supabase = getSupabaseBrowser();
    const { error: rpcError } = await supabase.rpc('update_hole', {
      p_hole_id: rowId,
      p_number: Number(row.number),
      p_par: Number(row.par),
      p_stroke_index: Number(row.stroke_index),
      p_distance_meters: row.distance_meters.trim() === '' ? null : Number(row.distance_meters),
    });

    if (rpcError) {
      setSaving(null);
      setError(`Opslaan mislukt voor hole ${row.number}: ${rpcError.message}`);
      return;
    }

    // A rename can swap another hole's number/SI under the hood, so
    // reload the full set from the database to stay truthful.
    const { data: freshHoles, error: reloadError } = await supabase
      .from('holes')
      .select('id, number, par, stroke_index, distance_meters')
      .eq('course_id', courseId)
      .order('number', { ascending: true });

    setSaving(null);

    if (reloadError || !freshHoles) {
      setError('Opgeslagen, maar de bijgewerkte lijst kon niet opnieuw geladen worden. Ververs de pagina.');
      return;
    }

    const typed = freshHoles as HoleRecord[];
    setRows(typed.map(toRowDraft));
    notifyParent(typed);
    setSuccess(`Hole ${row.number} opgeslagen.`);
  }

  // ─── Delete a hole ────────────────────────────────────────────────────
  async function deleteHole(holeId: string) {
    setError(null);
    setSuccess(null);
    setSaving(`delete-${holeId}`);

    const supabase = getSupabaseBrowser();
    const { error: deleteError } = await supabase.from('holes').delete().eq('id', holeId);

    setSaving(null);
    setConfirmDelete(null);

    if (deleteError) {
      setError(`Verwijderen mislukt: ${deleteError.message}`);
      return;
    }

    const removed = rows.find((r) => r.id === holeId);
    const remaining = holes.filter((h) => h.id !== holeId);
    setRows((prev) => prev.filter((r) => r.id !== holeId));
    notifyParent(remaining);
    setNewHole(nextDefaults(remaining));
    setSuccess(`Hole ${removed?.number ?? ''} verwijderd.`);
  }

  // ─── Add a new hole ───────────────────────────────────────────────────
  async function addHole() {
    const validationError = validateFields(newHole);
    if (validationError) {
      setError(validationError);
      return;
    }

    const number = Number(newHole.number);
    const si = Number(newHole.stroke_index);

    if (holes.some((h) => h.number === number)) {
      setError(`Holenummer ${number} bestaat al. Bewerk die hole of kies een ander nummer.`);
      return;
    }
    if (holes.some((h) => h.stroke_index === si)) {
      setError(`Stroke index ${si} is al in gebruik bij een andere hole.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving('new');

    const supabase = getSupabaseBrowser();
    const { data, error: insertError } = await supabase
      .from('holes')
      .insert({
        course_id: courseId,
        number,
        par: Number(newHole.par),
        stroke_index: si,
        distance_meters: newHole.distance_meters.trim() === '' ? null : Number(newHole.distance_meters),
      })
      .select('id, number, par, stroke_index, distance_meters')
      .single();

    setSaving(null);

    if (insertError || !data) {
      setError(`Toevoegen mislukt: ${insertError?.message ?? 'Onbekende fout'}`);
      return;
    }

    const added = data as HoleRecord;
    const next = sortByNumber([...holes, added]);
    setRows(next.map(toRowDraft));
    notifyParent(next);
    setNewHole(nextDefaults(next));
    setSuccess(`Hole ${added.number} toegevoegd.`);
  }

  const isSavingNew = saving === 'new';

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-5">
      <div>
        <p className="text-sm font-medium text-content">Holes beheren</p>
        <p className="text-xs text-content-muted mt-0.5">
          Pas par, stroke index en afstand aan, of hernummer een hole — bij een botsend nummer of SI wisselt de
          betreffende hole automatisch mee. Holes die al bij een lus horen, worden bij verwijderen automatisch
          uit die lus gehaald.
        </p>
      </div>

      {/* ─── Existing holes ─────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="text-sm text-content-muted">Nog geen holes. Voeg er een toe hieronder.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_auto_auto_1fr_auto] gap-3 px-1 text-xs uppercase tracking-wide text-content-muted">
            <span className="w-16">Nr</span>
            <span className="w-16">Par</span>
            <span className="w-16">SI</span>
            <span>Afstand (m)</span>
            <span className="w-20" />
          </div>

          {rows.map((row) => {
            const isSavingRow = saving === row.id;
            const isDeleting = saving === `delete-${row.id}`;
            const pendingDelete = confirmDelete === row.id;
            const disabled = isSavingRow || isDeleting;

            return (
              <div key={row.id} className="grid grid-cols-[auto_auto_auto_1fr_auto] gap-3 items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={row.number}
                  onChange={(e) => updateRow(row.id, { number: e.target.value })}
                  className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={disabled}
                />

                <select
                  value={row.par}
                  onChange={(e) => updateRow(row.id, { par: e.target.value })}
                  className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={disabled}
                >
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>

                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={18}
                  value={row.stroke_index}
                  onChange={(e) => updateRow(row.id, { stroke_index: e.target.value })}
                  className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={disabled}
                />

                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="—"
                  value={row.distance_meters}
                  onChange={(e) => updateRow(row.id, { distance_meters: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                  disabled={disabled}
                />

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
                      aria-label={`Verwijder hole ${row.number}`}
                    >
                      ✕
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => void deleteHole(row.id)}
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

      {/* ─── Add new hole ───────────────────────────────────────────── */}
      <div className="pt-3 border-t border-border space-y-3">
        <p className="text-xs font-medium text-content-muted uppercase tracking-wide">Hole toevoegen</p>

        <div className="grid grid-cols-2 sm:grid-cols-[auto_auto_auto_1fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-content-muted">Nr *</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={newHole.number}
              onChange={(e) => setNewHole((prev) => ({ ...prev, number: e.target.value }))}
              className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-content"
              disabled={isSavingNew}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-content-muted">Par *</label>
            <select
              value={newHole.par}
              onChange={(e) => setNewHole((prev) => ({ ...prev, par: e.target.value }))}
              className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-content"
              disabled={isSavingNew}
            >
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-content-muted">SI *</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={18}
              value={newHole.stroke_index}
              onChange={(e) => setNewHole((prev) => ({ ...prev, stroke_index: e.target.value }))}
              className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-content"
              disabled={isSavingNew}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-content-muted">Afstand (m)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="—"
              value={newHole.distance_meters}
              onChange={(e) => setNewHole((prev) => ({ ...prev, distance_meters: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm text-content"
              disabled={isSavingNew}
            />
          </div>

          <button
            type="button"
            onClick={() => void addHole()}
            disabled={isSavingNew}
            className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium self-end"
          >
            {isSavingNew ? 'Toevoegen…' : '+ Hole'}
          </button>
        </div>
      </div>

      {/* ─── Feedback ────────────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </div>
  );
}
