'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type LoopType = 'full_18' | 'front_9' | 'back_9' | 'custom';

interface TeeDraft {
  color: string;
}

interface HoleDraft {
  number: number;
  par: number;
  stroke_index: number;
  distance_meters_by_tee: Record<string, string>;
}

interface LoopDraft {
  name: string;
  tee_external_id: string;
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
  { color: 'Wit' },
  { color: 'Geel' },
];
const DEFAULT_PRIMARY_TEE_COLOR = DEFAULT_TEE_ROWS[0]?.color ?? 'Wit';

const TEE_COLOR_OPTIONS = ['Zwart', 'Wit', 'Geel', 'Blauw', 'Rood', 'Oranje'] as const;

function toTeeKey(color: string) {
  return color.trim().toLowerCase();
}

const DEFAULT_HOLES: HoleDraft[] = Array.from({ length: 18 }).map((_, idx) => ({
  number: idx + 1,
  par: 4,
  stroke_index: idx + 1,
  distance_meters_by_tee: {
    wit: '',
    geel: '',
  },
}));

const DEFAULT_LOOPS: LoopDraft[] = [
  {
    name: 'Volledige ronde',
    tee_external_id: 'wit',
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
  const [activeTeeKey, setActiveTeeKey] = useState<string>(toTeeKey(initialData?.tees?.[0]?.color ?? DEFAULT_PRIMARY_TEE_COLOR));
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
    setActiveTeeKey(toTeeKey(initialData.tees?.[0]?.color ?? DEFAULT_PRIMARY_TEE_COLOR));
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
        color: TEE_COLOR_OPTIONS.find((option) => !prev.some((tee) => tee.color === option)) ?? '',
      },
    ]);
  };

  const addLoop = () => {
    setLoops((prev) => [
      ...prev,
      {
        name: `Lus ${prev.length + 1}`,
        tee_external_id: toTeeKey(tees[0]?.color ?? ''),
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
      if (hole.par < 3 || hole.par > 5) return 'Par moet tussen 3 en 5 liggen.';
      if (hole.stroke_index < 1 || hole.stroke_index > 18) return 'Stroke index moet tussen 1 en 18 liggen.';
      if (hole.number < 1) return 'Hole nummer moet groter dan 0 zijn.';
    }

    const teeExternalIds = tees.map((tee) => toTeeKey(tee.color));
    if (teeExternalIds.some((externalId) => !externalId)) return 'Elke teebox moet een kleur hebben.';
    if (new Set(teeExternalIds).size !== teeExternalIds.length) return 'Elke teeboxkleur mag maar 1 keer voorkomen.';

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
      if (loop.tee_external_id && !teeExternalIds.includes(loop.tee_external_id)) {
        return `Lus "${loop.name}" verwijst naar een onbekende teebox.`;
      }
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
        external_id: toTeeKey(tee.color),
        name: tee.color.trim() || null,
        color: tee.color.trim() || null,
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
          const defaultTeeKey = toTeeKey(tees[0]?.color ?? '');
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

      for (const loop of loops) {
        const loopTeeId = loop.tee_external_id ? teeMap.get(loop.tee_external_id) ?? null : null;

        const { data: loopRow, error: loopError } = await supabase
          .from('loops')
          .insert({
            course_id: courseId,
            name: loop.name.trim(),
            holes_count: loop.hole_numbers.length,
            loop_type: deriveLoopType(loop.hole_numbers),
            tee_id: loopTeeId,
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

          const holeDefinition = holes.find((hole) => hole.number === holeNumber);
          const teeDistance = loop.tee_external_id ? holeDefinition?.distance_meters_by_tee[loop.tee_external_id] : undefined;
          const distanceMeters = teeDistance ? parseInt(teeDistance, 10) : null;

          return {
            loop_id: loopRow.id,
            hole_id: holeId,
            tee_id: loopTeeId,
            position: index + 1,
            distance_meters: Number.isNaN(distanceMeters as number) ? null : distanceMeters,
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
        <h2 className="text-xl font-bold text-white">
          {isEditMode ? 'Golfbaan bewerken' : 'Golfbaan aanmaken'}
        </h2>
        <p className="text-sm text-gray-400">
          {isEditMode
            ? 'Pas de basisgegevens aan. De structuur-editor volgt later als versiebeheer is ingericht.'
            : 'Maak handmatig een baan met teeboxen, lussen en holes. Nieuwe banen zijn standaard privé.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-400 mb-1.5">Naam *</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
            placeholder="bijv. Golfclub De Haenen"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Land</label>
          <input
            type="text"
            value={country}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
            placeholder="NL"
            maxLength={2}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Locatie</label>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-green-600"
          placeholder="bijv. Scherpenzeel"
        />
      </div>

      {!isEditMode && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Teeboxen</h3>
          <button
            type="button"
            onClick={addTee}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            + Teebox
          </button>
        </div>

        <div className="space-y-2">
          {tees.map((tee, index) => (
            <div key={`${tee.color}-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select
                value={tee.color}
                onChange={(event) => updateTee(index, { color: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">Kies teebox kleur</option>
                {TEE_COLOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
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
        <h3 className="text-sm font-semibold text-white">Holes</h3>
        <div className="flex flex-wrap gap-2">
          {tees.map((tee) => {
            const teeKey = toTeeKey(tee.color);
            return (
              <button
                key={teeKey || tee.color}
                type="button"
                onClick={() => setActiveTeeKey(teeKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeTeeKey === teeKey
                    ? 'bg-green-900/30 border-green-600 text-green-300'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {tee.color || 'Onbekend'}
              </button>
            );
          })}
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          <div className="grid grid-cols-4 gap-2 px-1 text-xs uppercase tracking-wide text-gray-500">
            <span>Hole nummer</span>
            <span>Par nummer</span>
            <span>Stroke index</span>
            <span>Meters</span>
          </div>
          {holes.map((hole, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <div className="px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm">
                {hole.number}
              </div>
              <select
                value={hole.par}
                onChange={(event) => updateHole(index, { par: parseInt(event.target.value, 10) })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
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
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="SI"
              />
              <input
                type="number"
                min={0}
                max={999}
                value={hole.distance_meters_by_tee[activeTeeKey] ?? ''}
                onChange={(event) => updateHoleDistance(index, activeTeeKey, event.target.value)}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
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
              distance_meters_by_tee: Object.fromEntries(tees.map((tee) => [toTeeKey(tee.color), ''])),
            }])}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            + Hole
          </button>
          <button
            type="button"
            onClick={() => setHoles((prev) => prev.slice(0, Math.max(9, prev.length - 1)))}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            - Hole
          </button>
        </div>
      </section>
      )}

      {!isEditMode && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Lussen</h3>
          <button
            type="button"
            onClick={addLoop}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            + Lus
          </button>
        </div>

        {loops.map((loop, index) => (
          <div key={index} className="p-3 rounded-xl border border-gray-800 bg-gray-900 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={loop.name}
                onChange={(event) => updateLoop(index, { name: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="Naam"
              />
              <select
                value={loop.tee_external_id}
                onChange={(event) => updateLoop(index, { tee_external_id: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">Geen vaste teebox</option>
                {tees.map((tee) => (
                  <option key={toTeeKey(tee.color)} value={toTeeKey(tee.color)}>
                    {tee.color || 'Onbekend'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setLoops((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                disabled={loops.length <= 1}
                className="px-3 py-2.5 bg-red-900/40 hover:bg-red-900 text-red-200 disabled:opacity-40 rounded-lg text-xs"
              >
                Verwijder
              </button>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Kies holes</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {holes.map((hole) => {
                  const checked = loop.hole_numbers.includes(hole.number);
                  return (
                    <label
                      key={hole.number}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                        checked
                          ? 'bg-green-900/20 border-green-700 text-green-200'
                          : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
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
                        className="rounded border-gray-700 bg-gray-800"
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
            className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium"
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
