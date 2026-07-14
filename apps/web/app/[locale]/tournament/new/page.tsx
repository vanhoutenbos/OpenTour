'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFormatter } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { CourseBuilderForm } from '@/components/course/CourseBuilderForm';
import { isLadderBetaUser } from '@/lib/featureFlags';

interface Course {
  id: string;
  name: string;
  location: string | null;
  holes_count: number;
  created_by?: string | null;
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

interface CategoryDraft {
  localId: string;
  name: string;
  gender: '' | 'male' | 'female' | 'mixed';
  handicap_min: string;
  handicap_max: string;
}

type Step = 'basics' | 'course' | 'loop_tee' | 'format' | 'categories' | 'confirm';

const STEP_LABELS: Record<Step, string> = {
  basics:     'Basis',
  course:     'Baan',
  loop_tee:   'Lus',
  format:     'Format',
  categories: 'Categorieën',
  confirm:    'Bevestigen',
};

export default function NewTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const locale = ((params.locale as string) || 'nl').toLowerCase();
  const format = useFormatter();
  const [step, setStep] = useState<Step>('basics');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [tees, setTees] = useState<Tee[]>([]);
  const [loadingLoops, setLoadingLoops] = useState(false);
  const [loadingTees, setLoadingTees] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [showCourseBuilder, setShowCourseBuilder] = useState(false);

  // Categorieën die lokaal worden opgebouwd vóór submit
  const [categories, setCategories] = useState<CategoryDraft[]>([]);
  const [catForm, setCatForm] = useState<Omit<CategoryDraft, 'localId'>>({
    name: '', gender: '', handicap_min: '', handicap_max: '',
  });
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const STORAGE_KEY = 'opentour-tournament-new';

  const defaultForm = {
    name: '',
    start_date: '',
    start_time: '09:00',
    course_id: '',
    loop_id: '',
    tee_id: '',
    format: 'stableford' as 'strokeplay' | 'stableford' | 'matchplay',
    scoring_type: 'gross' as 'gross' | 'net',
    rounds: 1,
    multi_rounds: false,
    // Laddercompetitie (beta, alleen zichtbaar voor info@vanhoutensolutions.nl —
    // zie analyseplan §2 en de addendum over competition_type vs. format).
    competition_type: 'single' as 'single' | 'ladder',
    ladder_top_rung_winner_count: 1,
    ladder_handicap_allowance_pct: 100,
    ladder_response_deadline_days: 14,
    ladder_min_matches_per_period: 0,
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
    setCategories([]);
  };

  const loadCourses = async (userId: string) => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('courses')
      .select('id, name, location, holes_count, created_by')
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .order('name');

    const sortedCourses = ((data as Course[]) ?? []).sort((a, b) => {
      const aOwn = a.created_by === userId ? 1 : 0;
      const bOwn = b.created_by === userId ? 1 : 0;
      if (aOwn !== bOwn) return bOwn - aOwn;
      return a.name.localeCompare(b.name, 'nl');
    });

    setCourses(sortedCourses);
  };

  const buildStartDatetime = (): string | null => {
    if (!form.start_date) return null;
    return `${form.start_date}T${form.start_time || '00:00'}:00`;
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
      if (!data.user) {
        router.replace(`/${locale}/login`);
        return;
      }

      setCurrentUserId(data.user.id);
      setCurrentUserEmail(data.user.email ?? '');
      void loadCourses(data.user.id);
    });
  }, [router, locale]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (form.course_id) {
      setLoadingLoops(true);
      setLoadingTees(true);
      supabase.from('loops').select('*').eq('course_id', form.course_id).order('name')
        .then(({ data }) => { setLoops((data as Loop[]) ?? []); setLoadingLoops(false); });
      supabase.from('tees').select('*').eq('course_id', form.course_id).order('name')
        .then(({ data }) => { setTees((data as Tee[]) ?? []); setLoadingTees(false); });
    } else {
      setLoops([]);
      setTees([]);
    }
  }, [form.course_id]);

  // ---- Categorie beheer (lokaal) ----
  const openNewCat = () => {
    setEditingCatId(null);
    setCatForm({ name: '', gender: '', handicap_min: '', handicap_max: '' });
    setShowCatForm(true);
  };

  const openEditCat = (cat: CategoryDraft) => {
    setEditingCatId(cat.localId);
    setCatForm({ name: cat.name, gender: cat.gender, handicap_min: cat.handicap_min, handicap_max: cat.handicap_max });
    setShowCatForm(true);
  };

  const saveCat = () => {
    if (!catForm.name.trim()) return;
    if (editingCatId) {
      setCategories(prev => prev.map(c =>
        c.localId === editingCatId ? { ...c, ...catForm } : c
      ));
    } else {
      setCategories(prev => [...prev, { localId: crypto.randomUUID(), ...catForm }]);
    }
    setShowCatForm(false);
  };

  const deleteCat = (localId: string) => {
    setCategories(prev => prev.filter(c => c.localId !== localId));
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace(`/${locale}/login`); return; }

    // 1. Toernooi aanmaken
    const { data, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: form.name,
        start_date: buildStartDatetime(),
        course_id: form.course_id || null,
        loop_id: form.loop_id || null,
        format: form.format,
        competition_type: form.competition_type,
        scoring_type: form.scoring_type,
        rounds: form.rounds,
        status: 'draft',
        is_public: true,
        created_by: userData.user.id,
      })
      .select('id')
      .single();

    if (tournamentError || !data) {
      setError('Aanmaken mislukt. Probeer het opnieuw.');
      setLoading(false);
      return;
    }

    // 2. Ladder-instellingen aanmaken (alleen bij een laddercompetitie — de
    // RLS-gate zorgt dat dit alleen lukt voor info@vanhoutensolutions.nl,
    // wat sowieso de enige is die competition_type='ladder' kon kiezen)
    if (form.competition_type === 'ladder') {
      const { error: ladderError } = await supabase.from('ladder_settings').insert({
        tournament_id: data.id,
        top_rung_winner_count: form.ladder_top_rung_winner_count,
        handicap_allowance_pct: form.ladder_handicap_allowance_pct,
        response_deadline_days: form.ladder_response_deadline_days,
        min_matches_per_period: form.ladder_min_matches_per_period,
      });
      if (ladderError) {
        setError(`Toernooi aangemaakt, maar ladder-instellingen opslaan mislukt: ${ladderError.message}`);
        setLoading(false);
        router.push(`/${locale}/tournament/${data.id}/manage`);
        return;
      }
    }

    // 3. Categorieën aanmaken (als die er zijn)
    if (categories.length > 0) {
      const { error: catError } = await supabase.from('tournament_categories').insert(
        categories.map((c, i) => ({
          tournament_id: data.id,
          name: c.name,
          gender: c.gender || null,
          handicap_min: c.handicap_min ? parseFloat(c.handicap_min) : null,
          handicap_max: c.handicap_max ? parseFloat(c.handicap_max) : null,
          sort_order: i,
        }))
      );
      if (catError) {
        // Toernooi is al aangemaakt, stuur door maar meld de fout
        setError(`Toernooi aangemaakt, maar categorieën opslaan mislukt: ${catError.message}`);
        setLoading(false);
        router.push(`/${locale}/tournament/${data.id}/manage`);
        return;
      }
    }

    clearForm();
    router.push(`/${locale}/tournament/${data.id}/manage`);
  };

  const steps: Step[] = ['basics', 'course', 'loop_tee', 'format', 'categories', 'confirm'];
  const stepIndex = steps.indexOf(step);

  const genderLabel = (g: CategoryDraft['gender']) =>
    ({ male: 'Heren', female: 'Dames', mixed: 'Gemengd', '': '' })[g];

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-2 border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => stepIndex > 0 ? setStep(steps[stepIndex - 1]!) : router.back()}
            className="text-content-muted hover:text-content transition-colors"
          >
            ← Terug
          </button>
          <h1 className="text-lg font-semibold text-content flex-1">Nieuw toernooi</h1>
          <button onClick={clearForm} className="text-sm text-content-muted hover:text-red-400 transition-colors">
            Wis
          </button>
        </div>
      </div>

      {/* Voortgangsbalk */}
      <div className="bg-surface-2 border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-green-600' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Stap 1: Basisinfo ── */}
        {step === 'basics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-content mb-1">Toernooi details</h2>
              <p className="text-content-muted text-sm">Geef je toernooi een naam, datum en starttijd.</p>
            </div>

            <div>
              <label className="block text-sm text-content-muted mb-1.5">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="bijv. Clubkampioenschap 2026"
                className="w-full px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content
                           placeholder-content-muted focus:outline-none focus:border-green-600 transition-colors"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-content-muted mb-1.5">Datum</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => updateForm({ start_date: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content
                             focus:outline-none focus:border-green-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-content-muted mb-1.5">
                  Starttijd
                  <span className="text-content-muted text-xs ml-1">— eerste flight</span>
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => updateForm({ start_time: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content
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
                  className={`w-12 h-6 rounded-full transition-colors relative ${form.multi_rounds ? 'bg-green-600' : 'bg-border-strong'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.multi_rounds ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-content-secondary">Meerdere rondes</span>
              </label>
              {form.multi_rounds && (
                <div className="mt-3">
                  <label className="block text-sm text-content-muted mb-1.5">Aantal rondes</label>
                  <input
                    type="number" min={2} max={99} value={form.rounds}
                    onChange={(e) => { const v = parseInt(e.target.value); updateForm({ rounds: isNaN(v) ? 2 : Math.max(2, Math.min(99, v)) }); }}
                    className="w-24 px-4 py-3 bg-surface-3 border border-border-strong rounded-xl text-content focus:outline-none focus:border-green-600 transition-colors"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('course')}
              disabled={!form.name.trim()}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* ── Stap 2: Baan ── */}
        {step === 'course' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-content mb-1">Golfbaan</h2>
              <p className="text-content-muted text-sm">Kies een baan of sla over om later in te stellen.</p>
            </div>

            <button
              onClick={() => setShowCourseBuilder(true)}
              className="w-full py-3 border border-dashed border-green-700 hover:border-green-500 text-green-400 hover:text-green-300 rounded-xl text-sm transition-colors"
            >
              + Nieuwe baan toevoegen
            </button>

            {courses.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => updateForm({ course_id: '', loop_id: '', tee_id: '' })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    form.course_id === '' ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                  }`}
                >
                  <span className="font-medium">Nog niet kiezen</span>
                  <span className="text-content-muted text-sm block">Stel de baan later in</span>
                </button>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateForm({ course_id: c.id, loop_id: '', tee_id: '' })}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      form.course_id === c.id ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-content-muted text-sm block">{c.location ?? 'Locatie onbekend'} · {c.holes_count} holes</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border-strong rounded-2xl">
                <p className="text-content-muted text-sm mb-2">Nog geen banen beschikbaar.</p>
                <p className="text-content-muted text-xs">Maak direct hierboven je eerste baan aan.</p>
              </div>
            )}

            <button
              onClick={() => setStep('loop_tee')}
              className="w-full py-4 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* ── Stap 3: Lussen & Tees ── */}
        {step === 'loop_tee' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-content mb-1">Lussen &amp; afslagen</h2>
              <p className="text-content-muted text-sm">Kies een lus en afslagkleur voor de wedstrijd.</p>
            </div>

            {!form.course_id ? (
              <div className="text-center py-8 border border-dashed border-border-strong rounded-2xl">
                <p className="text-content-muted text-sm">Selecteer eerst een baan om lussen te kiezen.</p>
              </div>
            ) : loadingLoops ? (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 text-content-muted">
                  <span className="w-4 h-4 border-2 border-border-strong border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Laden...</span>
                </div>
              </div>
            ) : loops.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border-strong rounded-2xl">
                <p className="text-content-muted text-sm">Geen lussen gevonden voor deze baan.</p>
                <p className="text-content-muted text-xs mt-1">Je kunt zonder lus verdergaan.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-content-muted mb-2">Kies een lus</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loops.map((loop) => (
                    <button
                      key={loop.id}
                      onClick={() => updateForm({ loop_id: loop.id, tee_id: loop.tee_id || '' })}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        form.loop_id === loop.id ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                      }`}
                    >
                      <span className="font-medium">{loop.name}</span>
                      <span className="text-content-muted text-sm block">
                        {loop.holes_count} holes · {{ full_18: 'Full 18', front_9: 'Front 9', back_9: 'Back 9', custom: 'Aangepast' }[loop.loop_type]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.loop_id && !loadingTees && tees.length > 0 && (
              <div>
                <label className="block text-sm text-content-muted mb-2">Kies een afslagkleur</label>
                <div className="space-y-2">
                  {tees.map((tee) => (
                    <button
                      key={tee.id}
                      onClick={() => updateForm({ tee_id: tee.id })}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        form.tee_id === tee.id ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                      }`}
                    >
                      <span className="font-medium">{tee.color || tee.name || 'Onbekend'}</span>
                      {tee.name && <span className="text-content-muted text-xs block">{tee.name}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.loop_id && (
              <div className="bg-surface-2 border border-border rounded-2xl px-4 py-3">
                <p className="text-content text-sm">
                  {loops.find(l => l.id === form.loop_id)?.holes_count ?? '?'} holes
                  {form.tee_id && tees.find(t => t.id === form.tee_id)?.color ? ` · ${tees.find(t => t.id === form.tee_id)?.color} tee` : ''}
                </p>
              </div>
            )}

            <button
              onClick={() => setStep('format')}
              disabled={Boolean(form.course_id && loops.length > 0 && !form.loop_id)}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* ── Stap 4: Spelformat ── */}
        {step === 'format' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-content mb-1">Spelformat</h2>
              <p className="text-content-muted text-sm">Hoe wordt de winnaar bepaald?</p>
            </div>

            {isLadderBetaUser(currentUserEmail) && (
              <div>
                <label className="block text-sm text-content-muted mb-2">
                  Competitievorm <span className="text-amber-400">(beta)</span>
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'single', label: 'Regulier toernooi', desc: 'Eén event, zelf format kiezen' },
                    { value: 'ladder', label: 'Laddercompetitie', desc: 'Piramide, spelers dagen elkaar uit' },
                  ].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        if (c.value === 'ladder') {
                          updateForm({ competition_type: 'ladder', format: 'matchplay' });
                        } else {
                          updateForm({ competition_type: 'single' });
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl border transition-colors text-left ${
                        form.competition_type === c.value ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                      }`}
                    >
                      <span className="font-medium block">{c.label}</span>
                      <span className="text-content-muted text-xs">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.competition_type === 'ladder' ? (
              <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-4">
                <p className="text-content-muted text-sm">
                  Een laddercompetitie bestaat uit matchplay-wedstrijden (handicapverrekening
                  stel je hieronder in). Het format hierboven staat daarom vast op Matchplay.
                </p>

                <div>
                  <label className="block text-sm text-content-muted mb-1">
                    Handicap allowance (% van het baanhandicap-verschil)
                  </label>
                  <input
                    type="number" min={0} max={100}
                    value={form.ladder_handicap_allowance_pct}
                    onChange={(e) => updateForm({ ladder_handicap_allowance_pct: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-border-strong bg-surface-3 text-content"
                  />
                  <p className="text-content-muted text-xs mt-1">
                    NGF-voorbeeld gebruikt 100%; sommige clubs kiezen bewust lager (bv. 70-75%). 0% = bruto.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-content-muted mb-1">Aantal winnaars bovenste trede</label>
                  <input
                    type="number" min={1}
                    value={form.ladder_top_rung_winner_count}
                    onChange={(e) => updateForm({ ladder_top_rung_winner_count: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-border-strong bg-surface-3 text-content"
                  />
                </div>

                <div>
                  <label className="block text-sm text-content-muted mb-1">Reactietermijn op een uitdaging (dagen)</label>
                  <input
                    type="number" min={1}
                    value={form.ladder_response_deadline_days}
                    onChange={(e) => updateForm({ ladder_response_deadline_days: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-border-strong bg-surface-3 text-content"
                  />
                </div>

                <div>
                  <label className="block text-sm text-content-muted mb-1">
                    Minimumaantal wedstrijden per speler (0 = geen minimum)
                  </label>
                  <input
                    type="number" min={0}
                    value={form.ladder_min_matches_per_period}
                    onChange={(e) => updateForm({ ladder_min_matches_per_period: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-border-strong bg-surface-3 text-content"
                  />
                  <p className="text-content-muted text-xs mt-1">
                    Wordt nu alleen getoond in het beheerscherm; automatische uitsluiting volgt later.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-content-muted mb-2">Scoringssysteem</label>
                <div className="space-y-2">
                  {[
                    { value: 'stableford', label: 'Stableford', desc: 'Punten per hole — meeste punten wint' },
                    { value: 'strokeplay',     label: 'Stroke play', desc: 'Minste slagen over alle holes wint' },
                    { value: 'matchplay',      label: 'Matchplay',   desc: 'Hole-by-hole duels (1 vs 1)' },
                  ].map((f) => (
                    <button
                      key={f.value}
                      onClick={() => updateForm({ format: f.value as typeof form.format })}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        form.format === f.value ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                      }`}
                    >
                      <span className="font-medium">{f.label}</span>
                      <span className="text-content-muted text-sm block">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-content-muted mb-2">Bruto of netto?</label>
              <div className="flex gap-3">
                {[
                  { value: 'gross', label: 'Bruto', desc: 'Werkelijke slagen' },
                  { value: 'net',   label: 'Netto', desc: 'Met handicap aftrek' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateForm({ scoring_type: s.value as typeof form.scoring_type })}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-colors text-left ${
                      form.scoring_type === s.value ? 'bg-green-900/30 border-green-600 text-content' : 'bg-surface-3 border-border-strong text-content-secondary hover:border-border-strong'
                    }`}
                  >
                    <span className="font-medium block">{s.label}</span>
                    <span className="text-content-muted text-xs">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('categories')}
              className="w-full py-4 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
            >
              Volgende →
            </button>
          </div>
        )}

        {/* ── Stap 5: Categorieën ── */}
        {step === 'categories' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-content mb-1">Categorieën</h2>
              <p className="text-content-muted text-sm">
                Voeg categorieën toe zoals Heren of Dames. Flights worden per categorie gegenereerd.
              </p>
            </div>

            {/* Lijst van toegevoegde categorieën */}
            {categories.length > 0 && (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.localId}
                    className="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-content font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-content-muted mt-0.5">
                        {[
                          genderLabel(cat.gender),
                          cat.handicap_min && cat.handicap_max ? `HCP ${cat.handicap_min}–${cat.handicap_max}` :
                          cat.handicap_min ? `HCP ≥ ${cat.handicap_min}` :
                          cat.handicap_max ? `HCP ≤ ${cat.handicap_max}` : '',
                        ].filter(Boolean).join(' · ') || 'Geen filters'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditCat(cat)}
                        className="text-xs px-3 py-1.5 bg-surface-3 hover:bg-border-strong text-content rounded-lg"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => deleteCat(cat.localId)}
                        className="text-xs px-3 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-300 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulier voor nieuwe/bewerkte categorie */}
            {showCatForm ? (
              <div className="bg-surface-2 border border-border-strong rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-medium text-content">
                  {editingCatId ? 'Categorie bewerken' : 'Categorie toevoegen'}
                </h3>

                <div>
                  <label className="block text-xs text-content-muted mb-1">Naam *</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="bijv. Heren, Dames, Senioren"
                    autoFocus
                    className="w-full px-3 py-2.5 bg-surface-3 border border-border-strong rounded-xl text-content placeholder-content-muted text-sm focus:outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-content-muted mb-1">Geslacht</label>
                  <div className="flex gap-2">
                    {([['', 'Alle'], ['male', 'Heren'], ['female', 'Dames'], ['mixed', 'Gemengd']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCatForm(f => ({ ...f, gender: val }))}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          catForm.gender === val ? 'bg-green-900/30 border-green-600 text-green-300' : 'bg-surface-3 border-border-strong text-content-muted hover:border-border-strong'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-content-muted mb-1">HCP min</label>
                    <input
                      type="number" step="0.1" min="-10" max="54"
                      value={catForm.handicap_min}
                      onChange={e => setCatForm(f => ({ ...f, handicap_min: e.target.value }))}
                      placeholder="bijv. 0"
                      className="w-full px-3 py-2.5 bg-surface-3 border border-border-strong rounded-xl text-content placeholder-content-muted text-sm focus:outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-content-muted mb-1">HCP max</label>
                    <input
                      type="number" step="0.1" min="-10" max="54"
                      value={catForm.handicap_max}
                      onChange={e => setCatForm(f => ({ ...f, handicap_max: e.target.value }))}
                      placeholder="bijv. 54"
                      className="w-full px-3 py-2.5 bg-surface-3 border border-border-strong rounded-xl text-content placeholder-content-muted text-sm focus:outline-none focus:border-green-600"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowCatForm(false)}
                    className="flex-1 py-2.5 bg-surface-3 hover:bg-border-strong text-content rounded-xl text-sm"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={saveCat}
                    disabled={!catForm.name.trim()}
                    className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
                  >
                    {editingCatId ? 'Opslaan' : 'Toevoegen'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openNewCat}
                className="w-full py-3 border border-dashed border-border-strong hover:border-green-600 text-content-muted hover:text-green-400 rounded-xl text-sm transition-colors"
              >
                + Categorie toevoegen
              </button>
            )}

            {/* Navigatie */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 py-4 bg-surface-3 hover:bg-border-strong text-content-secondary font-medium rounded-xl transition-colors text-sm"
              >
                Overslaan
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={categories.length === 0}
                className="flex-1 py-4 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
              >
                Volgende →
              </button>
            </div>

            {categories.length === 0 && (
              <p className="text-center text-content-muted text-xs -mt-2">
                Je kunt categorieën ook later aanmaken via het beheerscherm.
              </p>
            )}
          </div>
        )}

        {/* ── Stap 6: Bevestigen ── */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-content mb-1">Bevestigen</h2>
              <p className="text-content-muted text-sm">Controleer de details en maak het toernooi aan.</p>
            </div>

            <div className="bg-surface-2 border border-border rounded-2xl divide-y divide-border">
              {[
                { label: 'Naam',      value: form.name },
                { label: 'Datum',     value: form.start_date ? format.dateTime(new Date(form.start_date), { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nog niet ingesteld' },
                { label: 'Starttijd', value: form.start_time ? `${form.start_time} (eerste flight)` : 'Niet ingesteld' },
                { label: 'Baan',      value: courses.find(c => c.id === form.course_id)?.name ?? 'Nog niet gekozen' },
                { label: 'Loop',      value: loops.find(l => l.id === form.loop_id)?.name ?? '—' },
                { label: 'Afslag',    value: tees.find(t => t.id === form.tee_id)?.color ?? '—' },
                { label: 'Format',    value: { stableford: 'Stableford', stroke: 'Stroke play', match: 'Matchplay' }[form.format] },
                { label: 'Scoring',   value: form.scoring_type === 'gross' ? 'Bruto' : 'Netto' },
                { label: 'Rondes',    value: form.multi_rounds ? `${form.rounds} rondes` : '1 ronde' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-4 py-3">
                  <span className="text-content-muted text-sm">{label}</span>
                  <span className="text-content text-sm font-medium">{value}</span>
                </div>
              ))}

              {/* Categorieën samenvatting */}
              <div className="flex justify-between px-4 py-3">
                <span className="text-content-muted text-sm">Categorieën</span>
                <span className="text-content text-sm font-medium">
                  {categories.length === 0
                    ? <span className="text-content-muted">Geen (later aanmaken)</span>
                    : categories.map(c => c.name).join(', ')}
                </span>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Aanmaken...' : '🏌️ Toernooi aanmaken →'}
            </button>
          </div>
        )}

      </div>

      {showCourseBuilder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full px-4 py-8 md:py-12 flex items-start justify-center">
            <div className="w-full max-w-4xl rounded-2xl border border-border bg-surface-2 p-5 md:p-6">
              <CourseBuilderForm
                locale={locale}
                onCancel={() => setShowCourseBuilder(false)}
                onCreated={async (created) => {
                  setShowCourseBuilder(false);
                  if (currentUserId) {
                    await loadCourses(currentUserId);
                  }

                  updateForm({
                    course_id: created.id,
                    loop_id: '',
                    tee_id: '',
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
