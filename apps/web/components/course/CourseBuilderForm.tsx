'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type LoopType = 'full_18' | 'front_9' | 'back_9' | 'custom';

type TeeGender = 'male' | 'female' | 'mixed' | null;

interface TeeDraft {
  color: string;
  gender: TeeGender;
}

interface HoleDraft {
  number: number;
  par: number;
  stroke_index: number;
  distance_meters_by_tee: Record<string, string>;
}

interface LoopDraft {
  name: string;
  hole_numbers: number[];
}

export interface CourseBuilderInitialData {
  course: {
    id: string;
    name: string;
    location: string | null;
    country: string;
  };
  tees?: TeeDraft[];
  holes?: HoleDraft[];
  loops?: LoopDraft[];
}

interface CourseBuilderFormProps {
  locale: string;
  mode?: 'create' | 'edit';
  initialData?: CourseBuilderInitialData;
  onCancel?: () => void;
  onCreated?: (created: { id: string; name: string }) => void;
  onSaved?: (saved: { id: string; name: string }) => void;
}

const DEFAULT_TEE_ROWS: TeeDraft[] = [
  { color: 'Wit', gender: 'male' },
  { color: 'Wit', gender: 'female' },
  { color: 'Geel', gender: 'male' },
];
const DEFAULT_PRIMARY_TEE_COLOR = DEFAULT_TEE_ROWS[0]?.color ?? 'Wit';

const TEE_COLOR_OPTIONS = ['Zwart', 'Wit', 'Geel', 'Blauw', 'Rood', 'Oranje'] as const;

function toTeeKey(color: string, gender?: TeeGender) {
  const base = color.trim().toLowerCase();
  return gender ? `${base}_${gender}` : base;
}

/** external_id voor opslag in de DB — zelfde logica als toTeeKey */
function toExternalId(color: string, gender: TeeGender) {
  return toTeeKey(color, gender);
}

const DEFAULT_HOLES: HoleDraft[] = Array.from({ length: 18 }).map((_, idx) => ({
  number: idx + 1,
  par: 4,
  stroke_index: idx + 1,
  distance_meters_by_tee: {
    wit_male: '',
    wit_female: '',
    geel_male: '',
  },
}));

const DEFAULT_LOOPS: LoopDraft[] = [
  {
    name: 'Volledige ronde',
    hole_numbers: Array.from({ length: 18 }).map((_, idx) => idx + 1),
  },
];

function unique(values: number[]): boolean {
  return new Set(values).size === values.length;
}

function deriveLoopType(holeNumbers: number[]): LoopType {
  const normalized = [...holeNumbers].sort((a, b) => a - b);
  if (normalized.length === 18 && normalized.every((value, index) => value === index + 1)) return 'full_18';
  if (normalized.length === 9 && normalized.every((value, index) => value === index + 1)) return 'front_9';
  if (normalized.length === 9 && normalized.every((value, index) => value === index + 10)) return 'back_9';
  return 'custom';
}

export function CourseBuilderForm({ locale, mode = 'create', initialData, onCancel, onCreated, onSaved }: CourseBuilderFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const [name, setName] = useState(initialData?.course.name ?? '');
  const [location, setLocation] = useState(initialData?.course.location ?? '');
  const [country, setCountry] = useState(initialData?.course.country ?? 'NL');
  const [tees, setTees] = useState<TeeDraft[]>(initialData?.tees?.length ? initialData.tees : DEFAULT_TEE_ROWS);
  const [holes, setHoles] = useState<HoleDraft[]>(initialData?.holes?.length ? initialData.holes : DEFAULT_HOLES);
  const [loops, setLoops] = useState<LoopDraft[]>(initialData?.loops?.length ? initialData.loops : DEFAULT_LOOPS);
  const [activeTeeKey, setActiveTeeKey] = useState<string>(
    toTeeKey(initialData?.tees?.[0]?.color ?? DEFAULT_PRIMARY_TEE_COLOR, initialData?.tees?.[0]?.gender ?? 'male')
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData) return;

    setName(initialData.course.name);
    setLocation(initialData.course.location ?? '');
    setCountry(initialData.course.country ?? 'NL');
    setTees(initialData.tees?.length ? initialData.tees : DEFAULT_TEE_ROWS);
    setHoles(initialData.holes?.length ? initialData.holes : DEFAULT_HOLES);
    setLoops(initialData.loops?.length ? initialData.loops : DEFAULT_LOOPS);
    setActiveTeeKey(toTeeKey(initialData.tees?.[0]?.color ?? DEFAULT_PRIMARY_TEE_COLOR, initialData.tees?.[0]?.gender ?? 'male'));
  }, [initialData]);

  const updateTee = (index: number, patch: Partial<TeeDraft>) => {
    setTees((prev) => prev.map((tee, rowIndex) => (rowIndex === index ? { ...tee, ...patch } : tee)));
  };

  const updateHole = (index: number, patch: Partial<HoleDraft>) => {
    setHoles((prev) => prev.map((hole, rowIndex) => (rowIndex === index ? { ...hole, ...patch } : hole)));
  };

  const updateHoleDistance = (index: number, teeKey: string, value: string) => {
    setHoles((prev) => prev.map((hole, rowIndex) => (
      rowIndex === index
        ? {
            ...hole,
            distance_meters_by_tee: {
              ...hole.distance_meters_by_tee,
              [teeKey]: value,
            },
          }
        : hole
    )));
  };

  const updateLoop = (index: number, patch: Partial<LoopDraft>) => {
    setLoops((prev) => prev.map((loop, rowIndex) => (rowIndex === index ? { ...loop, ...patch } : loop)));
  };

  const addTee = () => {
    setTees((prev) => [
      ...prev,
      {
        color: TEE_COLOR_OPTIONS.find((option) => !prev.some((tee) => tee.color === option && !tee.gender)) ?? '',
        gender: null,
      },
    ]);
  };

  const addLoop = () => {
    setLoops((prev) => [
      ...prev,
      {
        name: `Lus ${prev.length + 1}`,
        hole_numbers: [],
      },
    ]);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Naam is verplicht.';
    if (holes.length < 9) return 'Voeg minimaal 9 holes toe.';
    if (tees.length === 0) return 'Voeg minimaal 1 teebox toe.';
    if (loops.length === 0) return 'Voeg minimaal 1 lus toe.';

    const holeNumbers = holes.map((hole) => hole.number);
    const strokeIndexes = holes.map((hole) => hole.stroke_index);

    if (!unique(holeNumbers)) return 'Hole nummers moeten uniek zijn.';
    if (!unique(strokeIndexes)) return 'Stroke index moet uniek zijn binnen een baan.';

    for (const hole of holes) {
      if (hole.number < 1) return 'Hole nummer moet groter dan 0 zijn.';
    }

    const teeExternalIds = tees.map((tee) => toExternalId(tee.color, tee.gender));
    if (teeExternalIds.some((externalId) => !externalId)) return 'Elke teebox moet een kleur hebben.';
    if (new Set(teeExternalIds).size !== teeExternalIds.length) return 'Elke combinatie van kleur en geslacht mag maar 1 keer voorkomen.';

    for (const hole of holes) {
      if (hole.par < 1 || hole.par > 9) return 'Par moet tussen 1 en 9 liggen.';
      if (hole.stroke_index < 1) return 'Stroke index moet een positief nummer zijn.';
      for (const teeKey of teeExternalIds) {
        const distance = hole.distance_meters_by_tee[teeKey];
        if (distance && (parseInt(distance, 10) < 0 || parseInt(distance, 10) > 999)) {
          return 'Meters per hole moeten tussen 0 en 999 liggen.';
        }
      }
    }

    for (const loop of loops) {
      if (!loop.name.trim()) return 'Elke lus moet een naam hebben.';
      if (loop.hole_numbers.length === 0) return `Lus "${loop.name}" heeft geen geselecteerde holes.`;
      if (!unique(loop.hole_numbers)) return `Lus "${loop.name}" bevat dubbele holes.`;
      const unknownHole = loop.hole_numbers.find((holeNumber) => !holeNumbers.includes(holeNumber));
      if (unknownHole) return `Lus "${loop.name}" verwijst naar onbekende hole ${unknownHole}.`;
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = getSupabaseBrowser();
    let createdCourseId: string | null = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        router.replace(`/${locale}/login`);
        return;
      }

      let courseId = initialData?.course.id ?? null;
      let courseName = name.trim();

      if (isEditMode && initialData?.course.id) {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .update({
            name: name.trim(),
            location: location.trim() || null,
            country: country.trim() || 'NL',
            holes_count: holes.length,
          })
          .eq('id', initialData.course.id)
          .eq('created_by', authData.user.id)
          .select('id, name')
          .single();

        if (courseError || !courseData) throw courseError ?? new Error('Baan kon niet worden opgeslagen.');
        courseId = courseData.id;
        courseName = courseData.name;
        setSuccess(`Baan "${courseName}" is opgeslagen.`);
        onSaved?.({ id: courseData.id, name: courseName });
        setSaving(false);
        return;
      } else {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .insert({
            name: name.trim(),
            location: location.trim() || null,
            country: country.trim() || 'NL',
            holes_count: holes.length,
            source: 'custom',
            is_verified: false,
            is_public: false,
            created_by: authData.user.id,
          })
          .select('id, name')
          .single();

        if (courseError || !courseData) throw courseError ?? new Error('Baan kon niet worden aangemaakt.');
        courseId = courseData.id;
        courseName = courseData.name;
        createdCourseId = courseData.id;
      }

      if (!courseId) throw new Error('Geen baan gevonden om op te slaan.');

      const teePayload = tees.map((tee) => ({
        course_id: courseId,
        external_id: toExternalId(tee.color, tee.gender),
        name: tee.color.trim() || null,
        color: tee.color.trim() || null,
        gender: tee.gender ?? null,
      }));

      const { data: teeRows, error: teeError } = await supabase
        .from('tees')
        .insert(teePayload)
        .select('id, external_id');

      if (teeError || !teeRows) throw teeError ?? new Error('Teeboxen konden niet worden opgeslagen.');
      const teeMap = new Map(teeRows.map((tee) => [tee.external_id, tee.id]));

      const holePayload = holes
        .slice()
        .sort((a, b) => a.number - b.number)
        .map((hole) => {
          const defaultTeeKey = toExternalId(tees[0]?.color ?? '', tees[0]?.gender ?? null);
          const defaultDistance = hole.distance_meters_by_tee[defaultTeeKey];

          return {
            course_id: courseId,
            number: hole.number,
            par: hole.par,
            stroke_index: hole.stroke_index,
            distance_meters: defaultDistance ? parseInt(defaultDistance, 10) : null,
          };
        });

      const { data: holeRows, error: holeError } = await supabase
        .from('holes')
        .insert(holePayload)
        .select('id, number');

      if (holeError || !holeRows) throw holeError ?? new Error('Holes konden niet worden opgeslagen.');
      const holeMap = new Map(holeRows.map((hole) => [hole.number, hole.id]));

      const holeTeeDistancePayload = holes.flatMap((hole) => {
        const holeId = holeMap.get(hole.number);
        if (!holeId) return [];

        return tees
          .map((tee) => {
            const teeKey = toExternalId(tee.color, tee.gender);
            const teeId = teeMap.get(teeKey);
            const distance = hole.distance_meters_by_tee[teeKey];

            if (!teeId || !distance) return null;

            return {
              hole_id: holeId,
              tee_id: teeId,
              distance_meters: parseInt(distance, 10),
            };
          })
          .filter((row): row is { hole_id: string; tee_id: string; distance_meters: number } =>
            Boolean(row && !Number.isNaN(row.distance_meters))
          );
      });

      if (holeTeeDistancePayload.length > 0) {
        const { error: holeTeeError } = await supabase.from('hole_tee_distances').insert(holeTeeDistancePayload);
        if (holeTeeError) throw holeTeeError;
      }

      for (const loop of loops) {
        const { data: loopRow, error: loopError } = await supabase
          .from('loops')
          .insert({
            course_id: courseId,
            name: loop.name.trim(),
            holes_count: loop.hole_numbers.length,
            loop_type: deriveLoopType(loop.hole_numbers),
            tee_id: null,
            is_default: loops[0] === loop,
            created_by: authData.user.id,
          })
          .select('id')
          .single();

        if (loopError || !loopRow) throw loopError ?? new Error(`Lus "${loop.name}" kon niet worden opgeslagen.`);

        const loopHolePayload = loop.hole_numbers.map((holeNumber, index) => {
          const holeId = holeMap.get(holeNumber);
          if (!holeId) {
            throw new Error(`Hole ${holeNumber} bestaat niet en kan niet aan lus "${loop.name}" gekoppeld worden.`);
          }

          return {
            loop_id: loopRow.id,
            hole_id: holeId,
            tee_id: null,
            position: index + 1,
            distance_meters: null,
          };
        });

        const { error: loopHoleError } = await supabase.from('loop_holes').insert(loopHolePayload);
        if (loopHoleError) throw loopHoleError;
      }

      setSuccess(
        isEditMode
          ? `Baan "${courseName}" is opgeslagen.`
          : `Baan "${courseName}" is aangemaakt en alleen zichtbaar voor jou.`
      );

      if (isEditMode) {
        onSaved?.({ id: courseId, name: courseName });
      } else if (onCreated) {
        onCreated({ id: courseId, name: courseName });
      } else {
        setName('');
        setLocation('');
        setCountry('NL');
        setTees(DEFAULT_TEE_ROWS);
        setHoles(DEFAULT_HOLES);
        setLoops(DEFAULT_LOOPS);
      }
    } catch (submitError) {
      if (createdCourseId) {
        await supabase.from('courses').delete().eq('id', createdCourseId);
      }

      const message = submitError instanceof Error ? submitError.message : 'Aanmaken van de baan is mislukt.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-content">
          {isEditMode ? 'Golfbaan bewerken' : 'Golfbaan aanmaken'}
        </h2>
        <p className="text-sm text-content-muted">
          {isEditMode
            ? 'Pas de basisgegevens aan. De structuur-editor volgt later als versiebeheer is ingericht.'
            : 'Maak handmatig een baan met teeboxen, lussen en holes. Nieuwe banen zijn standaard privé.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm text-content-muted mb-1.5">Naam *</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content focus:outline-none focus:border-green-600"
            placeholder="bijv. Golfclub De Haenen"
          />
        </div>
        <div>
          <label className="block text-sm text-content-muted mb-1.5">Land</label>
          <input
            type="text"
            value={country}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
            className="w-full px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content focus:outline-none focus:border-green-600"
            placeholder="NL"
            maxLength={2}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-content-muted mb-1.5">Locatie</label>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="w-full px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content focus:outline-none focus:border-green-600"
          placeholder="bijv. Scherpenzeel"
        />
      </div>

      {!isEditMode && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content">Teeboxen</h3>
          <button
            type="button"
            onClick={addTee}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-border-strong text-content"
          >
            + Teebox
          </button>
        </div>

        <div className="space-y-2">
          {tees.map((tee, index) => (
            <div key={`${tee.color}-${tee.gender ?? 'none'}-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={tee.color}
                  onChange={(event) => updateTee(index, { color: event.target.value })}
                  className="px-3 py-2.5 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
                >
                  <option value="">Kies kleur</option>
                  {TEE_COLOR_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={tee.gender ?? ''}
                  onChange={(event) => updateTee(index, { gender: (event.target.value as TeeGender) || null })}
                  className="px-3 py-2.5 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
                >
                  <option value="">Geslacht (optioneel)</option>
                  <option value="male">Heren</option>
                  <option value="female">Dames</option>
                  <option value="mixed">Gemengd</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setTees((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                disabled={tees.length <= 1}
                className="px-3 py-2.5 bg-red-900/40 hover:bg-red-900 text-red-200 disabled:opacity-40 rounded-lg text-xs"
              >
                Verwijder
              </button>
            </div>
          ))}
        </div>
      </section>
      )}

      {!isEditMode && (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-content">Holes</h3>
        <div className="flex flex-wrap gap-2">
          {tees.map((tee) => {
            const teeKey = toExternalId(tee.color, tee.gender);
            const label = tee.gender === 'male' ? `${tee.color} · H`
              : tee.gender === 'female' ? `${tee.color} · D`
              : tee.gender === 'mixed' ? `${tee.color} · G`
              : tee.color || 'Onbekend';
            return (
              <button
                key={teeKey || tee.color}
                type="button"
                onClick={() => setActiveTeeKey(teeKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeTeeKey === teeKey
                    ? 'bg-green-900/30 border-green-600 text-green-300'
                    : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          <div className="grid grid-cols-4 gap-2 px-1 text-xs uppercase tracking-wide text-content-muted">
            <span>Hole nummer</span>
            <span>Par nummer</span>
            <span>Stroke index</span>
            <span>Meters</span>
          </div>
          {holes.map((hole, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <div className="px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-content text-sm">
                {hole.number}
              </div>
              <select
                value={hole.par}
                onChange={(event) => updateHole(index, { par: parseInt(event.target.value, 10) })}
                className="px-3 py-2.5 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
              >
                {Array.from({ length: 9 }).map((_, optionIndex) => (
                  <option key={optionIndex + 1} value={optionIndex + 1}>Par {optionIndex + 1}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={hole.stroke_index}
                onChange={(event) => updateHole(index, { stroke_index: parseInt(event.target.value, 10) || 1 })}
                className="px-3 py-2.5 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
                placeholder="SI"
              />
              <input
                type="number"
                min={0}
                max={999}
                value={hole.distance_meters_by_tee[activeTeeKey] ?? ''}
                onChange={(event) => updateHoleDistance(index, activeTeeKey, event.target.value)}
                className="px-3 py-2.5 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
                placeholder="meters"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHoles((prev) => [...prev, {
              number: prev.length + 1,
              par: 4,
              stroke_index: prev.length + 1,
              distance_meters_by_tee: Object.fromEntries(tees.map((tee) => [toExternalId(tee.color, tee.gender), ''])),
            }])}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-border-strong text-content"
          >
            + Hole
          </button>
          <button
            type="button"
            onClick={() => setHoles((prev) => prev.slice(0, Math.max(9, prev.length - 1)))}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-border-strong text-content"
          >
            - Hole
          </button>
        </div>
      </section>
      )}

      {!isEditMode && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content">Lussen</h3>
          <button
            type="button"
            onClick={addLoop}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-border-strong text-content"
          >
            + Lus
          </button>
        </div>

        {loops.map((loop, index) => (
          <div key={index} className="p-3 rounded-xl border border-border bg-surface-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={loop.name}
                onChange={(event) => updateLoop(index, { name: event.target.value })}
                className="px-3 py-2.5 bg-surface-3 border border-border-strong rounded-lg text-content text-sm"
                placeholder="Naam"
              />
              <button
                type="button"
                onClick={() => setLoops((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                disabled={loops.length <= 1}
                className="px-3 py-2.5 bg-red-900/40 hover:bg-red-900 text-red-200 disabled:opacity-40 rounded-lg text-xs"
              >
                Verwijder
              </button>
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-wide text-content-muted mb-2">Kies holes</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {holes.map((hole) => {
                  const checked = loop.hole_numbers.includes(hole.number);
                  return (
                    <label
                      key={hole.number}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                        checked
                          ? 'bg-green-900/20 border-green-700 text-green-200'
                          : 'bg-surface-2 border-border text-content-secondary hover:border-border-strong'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...loop.hole_numbers, hole.number].sort((a, b) => a - b)
                            : loop.hole_numbers.filter((value) => value !== hole.number);
                          updateLoop(index, { hole_numbers: next });
                        }}
                        className="rounded border-border-strong bg-surface-3"
                      />
                      <span>Hole {hole.number}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </section>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-surface-3 hover:bg-border-strong text-content font-medium"
          >
            Annuleren
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold"
        >
          {saving ? 'Opslaan...' : isEditMode ? 'Wijzigingen opslaan' : 'Baan aanmaken'}
        </button>
      </div>
    </div>
  );
}
