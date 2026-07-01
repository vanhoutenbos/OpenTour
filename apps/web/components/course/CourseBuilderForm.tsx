'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

type LoopType = 'full_18' | 'front_9' | 'back_9' | 'custom';

interface TeeDraft {
  external_id: string;
  name: string;
  color: string;
}

interface HoleDraft {
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
  distance_meters: string;
}

interface LoopDraft {
  name: string;
  loop_type: LoopType;
  tee_external_id: string;
  hole_numbers: string;
}

interface CourseBuilderFormProps {
  locale: string;
  onCancel?: () => void;
  onCreated?: (created: { id: string; name: string }) => void;
}

const DEFAULT_TEE_ROWS: TeeDraft[] = [
  { external_id: 'white', name: 'Wit', color: 'Wit' },
  { external_id: 'yellow', name: 'Geel', color: 'Geel' },
];

const DEFAULT_HOLES: HoleDraft[] = Array.from({ length: 18 }).map((_, idx) => ({
  number: idx + 1,
  par: 4,
  stroke_index: idx + 1,
  distance_meters: '',
}));

const DEFAULT_LOOPS: LoopDraft[] = [
  {
    name: 'Volledige ronde',
    loop_type: 'full_18',
    tee_external_id: 'white',
    hole_numbers: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18',
  },
];

function parseHoleNumbers(input: string): number[] {
  return input
    .split(',')
    .map((value) => parseInt(value.trim(), 10))
    .filter((value) => !Number.isNaN(value));
}

function unique(values: number[]): boolean {
  return new Set(values).size === values.length;
}

export function CourseBuilderForm({ locale, onCancel, onCreated }: CourseBuilderFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('NL');
  const [tees, setTees] = useState<TeeDraft[]>(DEFAULT_TEE_ROWS);
  const [holes, setHoles] = useState<HoleDraft[]>(DEFAULT_HOLES);
  const [loops, setLoops] = useState<LoopDraft[]>(DEFAULT_LOOPS);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateTee = (index: number, patch: Partial<TeeDraft>) => {
    setTees((prev) => prev.map((tee, rowIndex) => (rowIndex === index ? { ...tee, ...patch } : tee)));
  };

  const updateHole = (index: number, patch: Partial<HoleDraft>) => {
    setHoles((prev) => prev.map((hole, rowIndex) => (rowIndex === index ? { ...hole, ...patch } : hole)));
  };

  const updateLoop = (index: number, patch: Partial<LoopDraft>) => {
    setLoops((prev) => prev.map((loop, rowIndex) => (rowIndex === index ? { ...loop, ...patch } : loop)));
  };

  const addTee = () => {
    setTees((prev) => [
      ...prev,
      {
        external_id: `tee-${prev.length + 1}`,
        name: '',
        color: '',
      },
    ]);
  };

  const addLoop = () => {
    setLoops((prev) => [
      ...prev,
      {
        name: `Lus ${prev.length + 1}`,
        loop_type: 'custom',
        tee_external_id: tees[0]?.external_id ?? '',
        hole_numbers: '',
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

    const teeExternalIds = tees.map((tee) => tee.external_id.trim());
    if (teeExternalIds.some((externalId) => !externalId)) return 'Elke teebox moet een code hebben.';
    if (new Set(teeExternalIds).size !== teeExternalIds.length) return 'Teebox-codes moeten uniek zijn.';

    for (const loop of loops) {
      if (!loop.name.trim()) return 'Elke lus moet een naam hebben.';
      const parsedHoleNumbers = parseHoleNumbers(loop.hole_numbers);
      if (parsedHoleNumbers.length === 0) return `Lus "${loop.name}" heeft geen geldige holes.`;
      if (!unique(parsedHoleNumbers)) return `Lus "${loop.name}" bevat dubbele holes.`;
      const unknownHole = parsedHoleNumbers.find((holeNumber) => !holeNumbers.includes(holeNumber));
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
      createdCourseId = courseData.id;

      const teePayload = tees.map((tee) => ({
        course_id: courseData.id,
        external_id: tee.external_id.trim(),
        name: tee.name.trim() || null,
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
        .map((hole) => ({
          course_id: courseData.id,
          number: hole.number,
          par: hole.par,
          stroke_index: hole.stroke_index,
          distance_meters: hole.distance_meters ? parseInt(hole.distance_meters, 10) : null,
        }));

      const { data: holeRows, error: holeError } = await supabase
        .from('holes')
        .insert(holePayload)
        .select('id, number');

      if (holeError || !holeRows) throw holeError ?? new Error('Holes konden niet worden opgeslagen.');
      const holeMap = new Map(holeRows.map((hole) => [hole.number, hole.id]));

      for (const loop of loops) {
        const parsedLoopHoles = parseHoleNumbers(loop.hole_numbers);
        const loopTeeId = loop.tee_external_id ? teeMap.get(loop.tee_external_id) ?? null : null;

        const { data: loopRow, error: loopError } = await supabase
          .from('loops')
          .insert({
            course_id: courseData.id,
            name: loop.name.trim(),
            holes_count: parsedLoopHoles.length,
            loop_type: loop.loop_type,
            tee_id: loopTeeId,
            is_default: loops[0] === loop,
            created_by: authData.user.id,
          })
          .select('id')
          .single();

        if (loopError || !loopRow) throw loopError ?? new Error(`Lus "${loop.name}" kon niet worden opgeslagen.`);

        const loopHolePayload = parsedLoopHoles.map((holeNumber, index) => {
          const holeId = holeMap.get(holeNumber);
          if (!holeId) {
            throw new Error(`Hole ${holeNumber} bestaat niet en kan niet aan lus "${loop.name}" gekoppeld worden.`);
          }

          return {
            loop_id: loopRow.id,
            hole_id: holeId,
            tee_id: loopTeeId,
            position: index + 1,
          };
        });

        const { error: loopHoleError } = await supabase.from('loop_holes').insert(loopHolePayload);
        if (loopHoleError) throw loopHoleError;
      }

      setSuccess(`Baan "${courseData.name}" is aangemaakt en alleen zichtbaar voor jou.`);

      if (onCreated) {
        onCreated({ id: courseData.id, name: courseData.name });
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
        <h2 className="text-xl font-bold text-white">Golfbaan aanmaken</h2>
        <p className="text-sm text-gray-400">
          Maak handmatig een baan met teeboxen, lussen en holes. Nieuwe banen zijn standaard privé.
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
            <div key={`${tee.external_id}-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                value={tee.external_id}
                onChange={(event) => updateTee(index, { external_id: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="code (bijv. white)"
              />
              <input
                value={tee.name}
                onChange={(event) => updateTee(index, { name: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="naam"
              />
              <input
                value={tee.color}
                onChange={(event) => updateTee(index, { color: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="kleur"
              />
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

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Holes</h3>
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {holes.map((hole, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <input
                type="number"
                min={1}
                value={hole.number}
                onChange={(event) => updateHole(index, { number: parseInt(event.target.value, 10) || 1 })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="Hole"
              />
              <select
                value={hole.par}
                onChange={(event) => updateHole(index, { par: parseInt(event.target.value, 10) as 3 | 4 | 5 })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value={3}>Par 3</option>
                <option value={4}>Par 4</option>
                <option value={5}>Par 5</option>
              </select>
              <input
                type="number"
                min={1}
                max={18}
                value={hole.stroke_index}
                onChange={(event) => updateHole(index, { stroke_index: parseInt(event.target.value, 10) || 1 })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="SI"
              />
              <input
                type="number"
                min={0}
                value={hole.distance_meters}
                onChange={(event) => updateHole(index, { distance_meters: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="meters"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHoles((prev) => [...prev, { number: prev.length + 1, par: 4, stroke_index: 1, distance_meters: '' }])}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                value={loop.name}
                onChange={(event) => updateLoop(index, { name: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="Naam"
              />
              <select
                value={loop.loop_type}
                onChange={(event) => updateLoop(index, { loop_type: event.target.value as LoopType })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="full_18">Full 18</option>
                <option value="front_9">Front 9</option>
                <option value="back_9">Back 9</option>
                <option value="custom">Custom</option>
              </select>
              <select
                value={loop.tee_external_id}
                onChange={(event) => updateLoop(index, { tee_external_id: event.target.value })}
                className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">Geen vaste teebox</option>
                {tees.map((tee) => (
                  <option key={tee.external_id} value={tee.external_id}>
                    {tee.color || tee.name || tee.external_id}
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

            <input
              value={loop.hole_numbers}
              onChange={(event) => updateLoop(index, { hole_numbers: event.target.value })}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              placeholder="Hole volgorde, bijv. 1,2,3,4,5,6,7,8,9"
            />
          </div>
        ))}
      </section>

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
          {saving ? 'Opslaan...' : 'Baan aanmaken'}
        </button>
      </div>
    </div>
  );
}
