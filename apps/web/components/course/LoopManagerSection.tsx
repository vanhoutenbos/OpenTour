'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type LoopType = 'full_18' | 'front_9' | 'back_9' | 'custom';

const LOOP_TYPE_LABELS: Record<LoopType, string> = {
  full_18: 'Volledige 18',
  front_9: 'Eerste 9',
  back_9: 'Laatste 9',
  custom: 'Aangepast',
};

export interface LoopHoleRef {
  id: string;
  number: number;
}

export interface LoopTeeRef {
  id: string;
  label: string;
}

export interface LoopRecord {
  id: string;
  name: string;
  loop_type: LoopType;
  tee_id: string | null;
  is_default: boolean;
  holeNumbers: number[];
}

interface LoopManagerSectionProps {
  courseId: string;
  holes: LoopHoleRef[];
  tees: LoopTeeRef[];
  initialLoops: LoopRecord[];
  onLoopsChanged?: (loops: LoopRecord[]) => void;
}

interface RowDraft {
  id: string;
  name: string;
  teeId: string | null;
  holeNumbers: number[];
  isDefault: boolean;
  expanded: boolean;
  dirty: boolean;
}

interface NewLoopDraft {
  name: string;
  teeId: string | null;
  holeNumbers: number[];
}

function deriveLoopType(holeNumbers: number[]): LoopType {
  const normalized = [...holeNumbers].sort((a, b) => a - b);
  if (normalized.length === 18 && normalized.every((value, index) => value === index + 1)) return 'full_18';
  if (normalized.length === 9 && normalized.every((value, index) => value === index + 1)) return 'front_9';
  if (normalized.length === 9 && normalized.every((value, index) => value === index + 10)) return 'back_9';
  return 'custom';
}

function toggleHole(holeNumbers: number[], holeNumber: number, checked: boolean): number[] {
  return checked
    ? [...holeNumbers, holeNumber].sort((a, b) => a - b)
    : holeNumbers.filter((value) => value !== holeNumber);
}

export function LoopManagerSection({ courseId, holes, tees, initialLoops, onLoopsChanged }: LoopManagerSectionProps) {
  const [rows, setRows] = useState<RowDraft[]>(
    initialLoops.map((loop) => ({
      id: loop.id,
      name: loop.name,
      teeId: loop.tee_id,
      holeNumbers: loop.holeNumbers,
      isDefault: loop.is_default,
      expanded: false,
      dirty: false,
    }))
  );

  const [newLoop, setNewLoop] = useState<NewLoopDraft>({ name: '', teeId: null, holeNumbers: [] });
  const [addingOpen, setAddingOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // row id, 'new', or 'delete-<id>'
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
  const holeIdByNumber = new Map(holes.map((hole) => [hole.number, hole.id]));

  function notifyParent(nextRows: RowDraft[]) {
    onLoopsChanged?.(
      nextRows.map((row) => ({
        id: row.id,
        name: row.name,
        loop_type: deriveLoopType(row.holeNumbers),
        tee_id: row.teeId,
        is_default: row.isDefault,
        holeNumbers: row.holeNumbers,
      }))
    );
  }

  function updateRow(id: string, patch: Partial<RowDraft>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch, dirty: true } : row)));
  }

  function validateLoop(name: string, holeNumbers: number[]): string | null {
    if (!name.trim()) return 'Elke lus moet een naam hebben.';
    if (holeNumbers.length === 0) return `Lus "${name || '(naamloos)'}" heeft geen geselecteerde holes.`;
    return null;
  }

  // ─── Save an existing loop (name/tee/hole-selection) ─────────────────────
  async function saveRow(rowId: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const validationError = validateLoop(row.name, row.holeNumbers);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(rowId);

    const supabase = getSupabaseBrowser();
    const loopType = deriveLoopType(row.holeNumbers);

    const { error: updateError } = await supabase
      .from('loops')
      .update({
        name: row.name.trim(),
        holes_count: row.holeNumbers.length,
        loop_type: loopType,
        tee_id: row.teeId,
      })
      .eq('id', rowId);

    if (updateError) {
      setSaving(null);
      setError(`Opslaan mislukt voor "${row.name}": ${updateError.message}`);
      return;
    }

    // Vervang de hole-koppeling volledig: eerst verwijderen, dan opnieuw invoegen met nieuwe volgorde.
    const { error: deleteHolesError } = await supabase.from('loop_holes').delete().eq('loop_id', rowId);
    if (deleteHolesError) {
      setSaving(null);
      setError(`Holes bijwerken mislukt voor "${row.name}": ${deleteHolesError.message}`);
      return;
    }

    const loopHolePayload = row.holeNumbers.map((holeNumber, index) => {
      const holeId = holeIdByNumber.get(holeNumber);
      return {
        loop_id: rowId,
        hole_id: holeId as string,
        tee_id: null,
        position: index + 1,
      };
    });

    const { error: insertHolesError } = await supabase.from('loop_holes').insert(loopHolePayload);

    setSaving(null);

    if (insertHolesError) {
      setError(`Holes bijwerken mislukt voor "${row.name}": ${insertHolesError.message}`);
      return;
    }

    const nextRows = rows.map((r) => (r.id === rowId ? { ...r, dirty: false } : r));
    setRows(nextRows);
    setSuccess(`Lus "${row.name}" opgeslagen.`);
    notifyParent(nextRows);
  }

  // ─── Delete a loop (loop_holes cascade automatisch via FK) ───────────────
  async function deleteLoop(loopId: string) {
    setError(null);
    setSuccess(null);
    setSaving(`delete-${loopId}`);

    const supabase = getSupabaseBrowser();
    const { error: deleteError } = await supabase.from('loops').delete().eq('id', loopId);

    setSaving(null);
    setConfirmDelete(null);

    if (deleteError) {
      setError(`Verwijderen mislukt: ${deleteError.message}`);
      return;
    }

    const removed = rows.find((r) => r.id === loopId);
    const nextRows = rows.filter((r) => r.id !== loopId);
    setRows(nextRows);
    setSuccess(`Lus "${removed?.name ?? ''}" verwijderd.`);
    notifyParent(nextRows);
  }

  // ─── Add a new loop ───────────────────────────────────────────────────────
  async function addLoop() {
    const validationError = validateLoop(newLoop.name, newLoop.holeNumbers);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving('new');

    const supabase = getSupabaseBrowser();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setSaving(null);
      setError('Je sessie is verlopen. Log opnieuw in.');
      return;
    }

    const loopType = deriveLoopType(newLoop.holeNumbers);

    const { data: loopRow, error: insertError } = await supabase
      .from('loops')
      .insert({
        course_id: courseId,
        name: newLoop.name.trim(),
        holes_count: newLoop.holeNumbers.length,
        loop_type: loopType,
        tee_id: newLoop.teeId,
        is_default: rows.length === 0,
        created_by: authData.user.id,
      })
      .select('id')
      .single();

    if (insertError || !loopRow) {
      setSaving(null);
      setError(`Toevoegen mislukt: ${insertError?.message ?? 'Onbekende fout'}`);
      return;
    }

    const loopHolePayload = newLoop.holeNumbers.map((holeNumber, index) => {
      const holeId = holeIdByNumber.get(holeNumber);
      return {
        loop_id: loopRow.id,
        hole_id: holeId as string,
        tee_id: null,
        position: index + 1,
      };
    });

    const { error: insertHolesError } = await supabase.from('loop_holes').insert(loopHolePayload);

    setSaving(null);

    if (insertHolesError) {
      // Ruim de net aangemaakte lus op als de holes niet gekoppeld konden worden.
      await supabase.from('loops').delete().eq('id', loopRow.id);
      setError(`Toevoegen mislukt: ${insertHolesError.message}`);
      return;
    }

    const addedName = newLoop.name.trim();
    const nextRows: RowDraft[] = [
      ...rows,
      {
        id: loopRow.id,
        name: addedName,
        teeId: newLoop.teeId,
        holeNumbers: newLoop.holeNumbers,
        isDefault: rows.length === 0,
        expanded: false,
        dirty: false,
      },
    ];

    setRows(nextRows);
    setNewLoop({ name: '', teeId: null, holeNumbers: [] });
    setAddingOpen(false);
    setSuccess(`Lus "${addedName}" toegevoegd.`);
    notifyParent(nextRows);
  }

  const isSavingNew = saving === 'new';

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-content">Lussen</p>
          <p className="text-xs text-content-muted mt-0.5">
            Een lus is een geordende selectie holes die samen een ronde vormen (bijv. volledige 18, eerste 9,
            laatste 9, of een eigen combinatie).
          </p>
        </div>
        {!addingOpen && (
          <button
            type="button"
            onClick={() => setAddingOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-4 text-content text-xs font-medium"
          >
            + Lus
          </button>
        )}
      </div>

      {/* ─── Existing loops ─────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="text-sm text-content-muted">Nog geen lussen. Voeg er een toe hieronder.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isDeleting = saving === `delete-${row.id}`;
            const isSavingRow = saving === row.id;
            const pendingDelete = confirmDelete === row.id;
            const loopType = deriveLoopType(row.holeNumbers);

            return (
              <div key={row.id} className="rounded-xl border border-border bg-surface-2 p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, expanded: !r.expanded } : r)))}
                    className="mt-2 text-content-muted hover:text-content text-xs"
                    aria-label={row.expanded ? 'Inklappen' : 'Uitklappen'}
                  >
                    {row.expanded ? '▾' : '▸'}
                  </button>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      className="px-3 py-2 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
                      placeholder="Naam van de lus"
                      disabled={isSavingRow || isDeleting}
                    />
                    <div className="flex items-center gap-2 text-xs text-content-muted">
                      <span className="px-2 py-1 rounded-full border border-border bg-surface">
                        {LOOP_TYPE_LABELS[loopType]}
                      </span>
                      <span>{row.holeNumbers.length} holes</span>
                      {row.isDefault && (
                        <span className="px-2 py-1 rounded-full border border-green-700 bg-green-900/30 text-green-300">
                          Standaard
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
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
                        aria-label={`Verwijder ${row.name}`}
                      >
                        ✕
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void deleteLoop(row.id)}
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

                {row.expanded && (
                  <div className="pl-6 space-y-3">
                    {tees.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs text-content-muted">Teebox (optioneel)</label>
                        <select
                          value={row.teeId ?? ''}
                          onChange={(e) => updateRow(row.id, { teeId: e.target.value || null })}
                          className="w-full sm:w-64 rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-content"
                          disabled={isSavingRow || isDeleting}
                        >
                          <option value="">Geen specifieke teebox</option>
                          {tees.map((tee) => (
                            <option key={tee.id} value={tee.id}>{tee.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-xs uppercase tracking-wide text-content-muted mb-2">Kies holes</p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {sortedHoles.map((hole) => {
                          const checked = row.holeNumbers.includes(hole.number);
                          return (
                            <label
                              key={hole.id}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-green-900/20 border-green-700 text-green-200'
                                  : 'bg-surface-2 border-border text-content-secondary hover:border-border-strong'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  updateRow(row.id, { holeNumbers: toggleHole(row.holeNumbers, hole.number, e.target.checked) })
                                }
                                className="rounded border-border-strong bg-surface-3"
                                disabled={isSavingRow || isDeleting}
                              />
                              <span>Hole {hole.number}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add new loop ───────────────────────────────────────────────── */}
      {addingOpen && (
        <div className="pt-3 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-content-muted uppercase tracking-wide">Nieuwe lus</p>
            <button
              type="button"
              onClick={() => {
                setAddingOpen(false);
                setNewLoop({ name: '', teeId: null, holeNumbers: [] });
                setError(null);
              }}
              className="text-xs text-content-muted hover:text-content"
            >
              Annuleren
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1">
              <label className="text-xs text-content-muted">Naam *</label>
              <input
                value={newLoop.name}
                onChange={(e) => setNewLoop((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-2 border border-border-strong rounded-lg text-content text-sm"
                placeholder="bijv. Eerste 9 (Oost)"
                disabled={isSavingNew}
              />
            </div>

            {tees.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-content-muted">Teebox (optioneel)</label>
                <select
                  value={newLoop.teeId ?? ''}
                  onChange={(e) => setNewLoop((prev) => ({ ...prev, teeId: e.target.value || null }))}
                  className="w-full sm:w-56 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-content"
                  disabled={isSavingNew}
                >
                  <option value="">Geen specifieke teebox</option>
                  {tees.map((tee) => (
                    <option key={tee.id} value={tee.id}>{tee.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-xs uppercase tracking-wide text-content-muted mb-2">Kies holes</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {sortedHoles.map((hole) => {
                const checked = newLoop.holeNumbers.includes(hole.number);
                return (
                  <label
                    key={hole.id}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      checked
                        ? 'bg-green-900/20 border-green-700 text-green-200'
                        : 'bg-surface border-border text-content-secondary hover:border-border-strong'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setNewLoop((prev) => ({ ...prev, holeNumbers: toggleHole(prev.holeNumbers, hole.number, e.target.checked) }))
                      }
                      className="rounded border-border-strong bg-surface-3"
                      disabled={isSavingNew}
                    />
                    <span>Hole {hole.number}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void addLoop()}
            disabled={isSavingNew || !newLoop.name.trim() || newLoop.holeNumbers.length === 0}
            className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium"
          >
            {isSavingNew ? 'Toevoegen…' : '+ Lus toevoegen'}
          </button>
        </div>
      )}

      {/* ─── Feedback ───────────────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </div>
  );
}
