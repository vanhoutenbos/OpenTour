'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface Course {
  id: string;
  name: string;
  location: string | null;
  holes_count: number;
}

interface Loop {
  id: string;
  course_id: string;
  name: string;
  holes_count: number;
  loop_type: 'full_18' | 'front_9' | 'back_9' | 'custom';
  tee_id: string | null;
  is_default: boolean;
}

interface Tee {
  id: string;
  course_id: string;
  external_id: string;
  name: string | null;
  color: string | null;
}

type Step = 'basics' | 'course' | 'loop_tee' | 'format' | 'confirm';

export default function NewTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('basics');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [tees, setTees] = useState<Tee[]>([]);
  const [loadingLoops, setLoadingLoops] = useState(false);
  const [loadingTees, setLoadingTees] = useState(false);

  const STORAGE_KEY = 'opentour-tournament-new';

  const defaultForm = {
    name: '',
    start_date: '',       // YYYY-MM-DD
    start_time: '09:00',  // HH:MM — begintijd eerste flight
    course_id: '',
    loop_id: '',
    tee_id: '',
    format: 'stableford' as 'stroke' | 'stableford' | 'match',
    scoring_type: 'gross' as 'gross' | 'net',
    rounds: 1,
    multi_rounds: false,
  };

  const [form, setForm] = useState({ ...defaultForm });

  const saveToSession = (updated: typeof defaultForm) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateForm = (patch: Partial<typeof defaultForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      saveToSession(next);
      return next;
    });
  };

  const clearForm = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setForm({ ...defaultForm });
  };

  // Combineer datum + tijd naar een ISO datetime string
  const buildStartDatetime = (): string | null => {
    if (!form.start_date) return null;
    const time = form.start_time || '00:00';
    return `${form.start_date}T${time}:00`;
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.multi_rounds) parsed.rounds = 1;
        if (!parsed.start_time) parsed.start_time = '09:00';
        setForm((prev) => ({ ...prev, ...parsed }));
      } catch {}
    }

    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/nl/login');
    });

    supabase
      .from('courses')
      .select('id, name, location, holes_count')
      .order('name')
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (form.course_id) {
      setLoadingLoops(true);
      setLoadingTees(true);
      supabase
        .from('loops')
        .select('*')
        .eq('course_id', form.course_id)
        .order('name')
        .then(({ data }) => {
          setLoops((data as Loop[]) ?? []);
          setLoadingLoops(false);
        });
      supabase
        .from('tees')
        .select('*')
        .eq('course_id', form.course_id)
        .order('name')
        .then(({ data }) => {
          setTees((data as Tee[]) ?? []);
          setLoadingTees(false);
        });
    } else {
      setLoops([]);
      setTees([]);
    }
  }, [form.course_id]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/nl/login'); return; }

    const startDatetime = buildStartDatetime();

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: form.name,
        start_date: startDatetime,
        course_id: form.course_id || null,
        loop_id: form.loop_id || null,
        format: form.format,
        scoring_type: form.scoring_type,
        rounds: form.rounds,
        status: 'draft',
        is_public: true,
        created_by: userData.user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      setError('Aanmaken mislukt. Probeer het opnieuw.');
      setLoading(false);
      return;
    }

    clearForm();
    router.push(`/nl/tournament/${data.id}/manage`);
  };

  const steps: Step[] = ['basics', 'course', 'loop_tee', 'format', 'confirm'];
  const stepIndex = steps.indexOf(step);

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => stepIndex > 0 ? setStep(steps[stepIndex - 1]!) : router.back()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Terug
          </button>
          <h1 className="text-lg font-semibold text-white flex-1">Nieuw toernooi</h1>
          <button
            onClick={clearForm}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            Wis
          </button>
        </div>
      </div>

      {/* Voortgangsbalk */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-green-600' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Stap 1: Basisinfo */}
        {step === 'basics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Toernooi details</h2>
              <p className="text-gray-400 text-sm">Geef je toernooi een naam, datum en starttijd.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="bijv. Clubkampioenschap 2026"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
                autoFocus
              />
            </div>

            {/* Datum + tijd naast elkaar */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Datum</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => updateForm({ start_date: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                             focus:outline-none focus:border-green-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Starttijd
                  <span className="text-gray-600 text-xs ml-1">— eerste flight</span>
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => updateForm({ start_time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                             focus:outline-none focus:border-green-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => updateForm({
                    multi_rounds: !form.multi_rounds,
                    rounds: form.multi_rounds ? 1 : (form.rounds < 2 ? 2 : form.rounds),
                  })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    form.multi_rounds ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    form.multi_rounds ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className="text-sm text-gray-300">Meerdere rondes</span>
              </label>

              {form.multi_rounds && (
                <div className="mt-3">
                  <label className="block text-sm text-gray-400 mb-1.5">Aantal rondes</label>
                  <input
                    type="number"
                    min={2}
                    max={99}
                    value={form.rounds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      updateForm({ rounds: isNaN(v) ? 2 : Math.max(2, Math.min(99, v)) });
                    }}
                    className="w-24 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                               placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('course')}
              disabled={!form.name.trim()}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50
                         text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* Stap 2: Baan kiezen */}
        {step === 'course' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Golfbaan</h2>
              <p className="text-gray-400 text-sm">Kies een baan of sla over om later in te stellen.</p>
            </div>

            {courses.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => updateForm({ course_id: '', loop_id: '', tee_id: '' })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    form.course_id === ''
                      ? 'bg-green-900/30 border-green-600 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="font-medium">Nog niet kiezen</span>
                  <span className="text-gray-500 text-sm block">Stel de baan later in</span>
                </button>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateForm({ course_id: c.id, loop_id: '', tee_id: '' })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      form.course_id === c.id
                        ? 'bg-green-900/30 border-green-600 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-500 text-sm block">
                      {c.location ?? 'Locatie onbekend'} · {c.holes_count} holes
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-700 rounded-2xl">
                <p className="text-gray-400 text-sm mb-4">Nog geen banen beschikbaar.</p>
                <a
                  href="/nl/course/new"
                  className="text-green-500 hover:text-green-400 text-sm underline"
                >
                  Baan aanmaken →
                </a>
              </div>
            )}

            <button
              onClick={() => setStep('loop_tee')}
              className="w-full py-4 bg-green-700 hover:bg-green-600
                         text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* Stap 3: Lussen & Tees */}
        {step === 'loop_tee' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Lussen &amp; afslagen</h2>
              <p className="text-gray-400 text-sm">Kies een lus en afslagkleur voor de wedstrijd.</p>
            </div>

            {!form.course_id ? (
              <div className="text-center py-8 border border-dashed border-gray-700 rounded-2xl">
                <p className="text-gray-400 text-sm">Selecteer eerst een baan om lussen te kiezen.</p>
              </div>
            ) : loadingLoops ? (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Laden...</span>
                </div>
              </div>
            ) : loops.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-700 rounded-2xl">
                <p className="text-gray-400 text-sm">Geen lussen gevonden voor deze baan.</p>
                <p className="text-gray-600 text-xs mt-1">Je kunt zonder lus verdergaan.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Kies een lus</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loops.map((loop) => (
                    <button
                      key={loop.id}
                      onClick={() => updateForm({ loop_id: loop.id, tee_id: loop.tee_id || '' })}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        form.loop_id === loop.id
                          ? 'bg-green-900/30 border-green-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span className="font-medium">{loop.name}</span>
                      <span className="text-gray-500 text-sm block">
                        {loop.holes_count} holes · {
                          { full_18: 'Full 18', front_9: 'Front 9', back_9: 'Back 9', custom: 'Aangepast' }[loop.loop_type]
                        }
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.loop_id && !loadingTees && tees.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Kies een afslagkleur</label>
                <div className="space-y-2">
                  {tees.map((tee) => (
                    <button
                      key={tee.id}
                      onClick={() => updateForm({ tee_id: tee.id })}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        form.tee_id === tee.id
                          ? 'bg-green-900/30 border-green-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span className="font-medium">{tee.color || tee.name || 'Onbekend'}</span>
                      {tee.name && <span className="text-gray-500 text-xs block">{tee.name}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.loop_id && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                <p className="text-white text-sm">
                  {loops.find(l => l.id === form.loop_id)?.holes_count ?? '?'} holes
                  {form.tee_id && tees.find(t => t.id === form.tee_id)?.color
                    ? ` · ${tees.find(t => t.id === form.tee_id)?.color} tee`
                    : ''}
                </p>
              </div>
            )}

            <button
              onClick={() => setStep('format')}
              disabled={Boolean(form.course_id && loops.length > 0 && !form.loop_id)}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50
                         text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* Stap 4: Spelformat */}
        {step === 'format' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Spelformat</h2>
              <p className="text-gray-400 text-sm">Hoe wordt de winnaar bepaald?</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Scoringssysteem</label>
              <div className="space-y-2">
                {[
                  { value: 'stableford', label: 'Stableford', desc: 'Punten per hole — meeste punten wint' },
                  { value: 'stroke',     label: 'Stroke play', desc: 'Minste slagen over alle holes wint' },
                  { value: 'match',      label: 'Matchplay',   desc: 'Hole-by-hole duels (1 vs 1)' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => updateForm({ format: f.value as typeof form.format })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      form.format === f.value
                        ? 'bg-green-900/30 border-green-600 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="text-gray-500 text-sm block">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Bruto of netto?</label>
              <div className="flex gap-3">
                {[
                  { value: 'gross', label: 'Bruto', desc: 'Werkelijke slagen' },
                  { value: 'net',   label: 'Netto', desc: 'Met handicap aftrek' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateForm({ scoring_type: s.value as typeof form.scoring_type })}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-colors text-left ${
                      form.scoring_type === s.value
                        ? 'bg-green-900/30 border-green-600 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-medium block">{s.label}</span>
                    <span className="text-gray-500 text-xs">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full py-4 bg-green-700 hover:bg-green-600
                         text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* Stap 5: Bevestigen */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Bevestigen</h2>
              <p className="text-gray-400 text-sm">Controleer de details en maak het toernooi aan.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
              {[
                { label: 'Naam',        value: form.name },
                { label: 'Datum',       value: form.start_date ? new Date(form.start_date).toLocaleDateString('nl-NL') : 'Nog niet ingesteld' },
                { label: 'Starttijd',   value: form.start_time ? `${form.start_time} (eerste flight)` : 'Niet ingesteld' },
                { label: 'Baan',        value: courses.find(c => c.id === form.course_id)?.name ?? 'Nog niet gekozen' },
                { label: 'Loop',        value: loops.find(l => l.id === form.loop_id)?.name ?? '—' },
                { label: 'Afslag',      value: tees.find(t => t.id === form.tee_id)?.color ?? '—' },
                { label: 'Format',      value: { stableford: 'Stableford', stroke: 'Stroke play', match: 'Matchplay' }[form.format] },
                { label: 'Scoring',     value: form.scoring_type === 'gross' ? 'Bruto' : 'Netto' },
                { label: 'Rondes',      value: form.multi_rounds ? `${form.rounds} rondes` : '1 ronde' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-4 py-3">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50
                         text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Aanmaken...' : '🏌️ Toernooi aanmaken →'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
