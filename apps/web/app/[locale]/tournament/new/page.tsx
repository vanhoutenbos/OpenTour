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

type Step = 'basics' | 'course' | 'format' | 'confirm';

export default function NewTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('basics');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    start_date: '',
    course_id: '',
    format: 'stableford' as 'stroke' | 'stableford' | 'match',
    scoring_type: 'gross' as 'gross' | 'net',
    rounds: 1,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/nl/login');
    });

    // Banen ophalen
    supabase
      .from('courses')
      .select('id, name, location, holes_count')
      .order('name')
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  }, [router]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/nl/login'); return; }

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: form.name,
        start_date: form.start_date || null,
        course_id: form.course_id || null,
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

    router.push(`/nl/tournament/${data.id}/manage`);
  };

  const steps: Step[] = ['basics', 'course', 'format', 'confirm'];
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
          <h1 className="text-lg font-semibold text-white">Nieuw toernooi</h1>
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
              <p className="text-gray-400 text-sm">Geef je toernooi een naam en datum.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="bijv. Clubkampioenschap 2026"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Datum</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           focus:outline-none focus:border-green-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Aantal rondes</label>
              <div className="flex gap-3">
                {[1, 2, 3].map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm({ ...form, rounds: r })}
                    className={`flex-1 py-3 rounded-xl border font-medium transition-colors ${
                      form.rounds === r
                        ? 'bg-green-700 border-green-600 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {r} {r === 1 ? 'ronde' : 'rondes'}
                  </button>
                ))}
              </div>
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
                  onClick={() => setForm({ ...form, course_id: '' })}
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
                    onClick={() => setForm({ ...form, course_id: c.id })}
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
              onClick={() => setStep('format')}
              className="w-full py-4 bg-green-700 hover:bg-green-600
                         text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* Stap 3: Spelformat */}
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
                    onClick={() => setForm({ ...form, format: f.value as typeof form.format })}
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
                    onClick={() => setForm({ ...form, scoring_type: s.value as typeof form.scoring_type })}
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

        {/* Stap 4: Bevestigen */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Bevestigen</h2>
              <p className="text-gray-400 text-sm">Controleer de details en maak het toernooi aan.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
              {[
                { label: 'Naam',       value: form.name },
                { label: 'Datum',      value: form.start_date ? new Date(form.start_date).toLocaleDateString('nl-NL') : 'Nog niet ingesteld' },
                { label: 'Baan',       value: courses.find(c => c.id === form.course_id)?.name ?? 'Nog niet gekozen' },
                { label: 'Format',     value: { stableford: 'Stableford', stroke: 'Stroke play', match: 'Matchplay' }[form.format] },
                { label: 'Scoring',    value: form.scoring_type === 'gross' ? 'Bruto' : 'Netto' },
                { label: 'Rondes',     value: `${form.rounds}` },
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
