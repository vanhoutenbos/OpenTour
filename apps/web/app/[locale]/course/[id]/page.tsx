'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CourseBuilderForm, type CourseBuilderInitialData } from '@/components/course/CourseBuilderForm';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface CourseHeader {
  id: string;
  name: string;
  location: string | null;
  country: string;
  holes_count: number;
}

interface TeeRow {
  id: string;
  external_id: string;
  name: string | null;
  color: string | null;
  slope_rating: number | null;
  course_rating: number | null;
}

interface HoleRow {
  id: string;
  number: number;
  par: 3 | 4 | 5;
  stroke_index: number;
  distance_meters: number | null;
}

interface LoopRow {
  id: string;
  name: string;
  loop_type: 'full_18' | 'front_9' | 'back_9' | 'custom';
  tee_id: string | null;
}

interface LoopHoleRow {
  loop_id: string;
  hole_id: string;
  position: number;
  distance_meters?: number | null;
}

interface HoleTeeDistanceRow {
  hole_id: string;
  tee_id: string;
  distance_meters: number;
}

export default function EditCoursePage() {
  const params = useParams();
  const locale = ((params.locale as string) || 'nl').toLowerCase();
  const courseId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<CourseBuilderInitialData | null>(null);
  const [courseHeader, setCourseHeader] = useState<CourseHeader | null>(null);
  const [teeCount, setTeeCount] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [whsRows, setWhsRows] = useState<
    { id: string; label: string; slope: string; rating: string }[]
  >([]);
  const [whsSaving, setWhsSaving] = useState(false);
  const [whsError, setWhsError] = useState<string | null>(null);
  const [whsSuccess, setWhsSuccess] = useState<string | null>(null);
  const [structureView, setStructureView] = useState<{
    teeLabels: string[];
    loopCards: {
      id: string;
      name: string;
      loopType: string;
      holeNumbers: string;
    }[];
    holeRows: {
      number: number;
      par: 3 | 4 | 5;
      stroke_index: number;
      distance_meters: string;
    }[];
  }>({ teeLabels: [], loopCards: [], holeRows: [] });

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function loadCourse() {
      setLoading(true);
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setError('Je sessie is verlopen. Log opnieuw in.');
        setLoading(false);
        return;
      }

      const [{ data: course }, { data: tees }, { data: holes }, { data: loops }, { data: loopHoles }, { data: holeTeeDistances }] = await Promise.all([
        supabase
          .from('courses')
          .select('id, name, location, country, holes_count')
          .eq('id', courseId)
          .eq('created_by', authData.user.id)
          .maybeSingle(),
        supabase
          .from('tees')
          .select('id, external_id, name, color, slope_rating, course_rating')
          .eq('course_id', courseId)
          .order('created_at', { ascending: true }),
        supabase
          .from('holes')
          .select('id, number, par, stroke_index, distance_meters')
          .eq('course_id', courseId)
          .order('number', { ascending: true }),
        supabase
          .from('loops')
          .select('id, name, loop_type, tee_id')
          .eq('course_id', courseId)
          .order('created_at', { ascending: true }),
        supabase
          .from('loop_holes')
          .select('loop_id, hole_id, position, distance_meters')
          .in('loop_id', (await supabase.from('loops').select('id').eq('course_id', courseId)).data?.map((row) => row.id) ?? [])
          .order('position', { ascending: true }),
        supabase
          .from('hole_tee_distances')
          .select('hole_id, tee_id, distance_meters')
          .in('hole_id', (await supabase.from('holes').select('id').eq('course_id', courseId)).data?.map((row) => row.id) ?? []),
      ]);

      if (!course) {
        setError('Baan niet gevonden of je bent niet de eigenaar.');
        setLoading(false);
        return;
      }

      setCourseHeader(course as CourseHeader);

      const teeRows = (tees as TeeRow[] | null) ?? [];
      const holeRows = (holes as HoleRow[] | null) ?? [];
      const loopRows = (loops as LoopRow[] | null) ?? [];
      const loopHoleRows = (loopHoles as LoopHoleRow[] | null) ?? [];
      const holeTeeDistanceRows = (holeTeeDistances as HoleTeeDistanceRow[] | null) ?? [];

      const teeDrafts = teeRows.map((tee) => ({
        color: tee.color ?? '',
      }));

      const holeDrafts = holeRows.map((hole) => {
        const distance_meters_by_tee = Object.fromEntries(
          teeRows.map((tee) => {
            const matchingDistance = holeTeeDistanceRows.find(
              (distance) => distance.hole_id === hole.id && distance.tee_id === tee.id
            );

            return [tee.external_id, matchingDistance?.distance_meters?.toString() ?? ''];
          })
        );

        return {
          number: hole.number,
          par: hole.par,
          stroke_index: hole.stroke_index,
          distance_meters_by_tee,
        };
      });

      const loopDrafts = loopRows.map((loop) => {
        const holeIdsForLoop = loopHoleRows
          .filter((loopHole) => loopHole.loop_id === loop.id)
          .sort((a, b) => a.position - b.position)
          .map((loopHole) => holeRows.find((hole) => hole.id === loopHole.hole_id)?.number)
          .filter((value): value is number => typeof value === 'number');

        const teeExternalId = loop.tee_id ? teeRows.find((tee) => tee.id === loop.tee_id)?.external_id ?? '' : '';

        return {
          name: loop.name,
          hole_numbers: holeIdsForLoop,
        };
      });

      const teeLabels = teeRows.map((tee) => tee.color || tee.name || tee.external_id);
      setWhsRows(
        teeRows.map((tee) => ({
          id: tee.id,
          label: tee.color || tee.name || tee.external_id,
          slope: tee.slope_rating?.toString() ?? '',
          rating: tee.course_rating?.toString() ?? '',
        }))
      );
      const loopCards = loopRows.map((loop) => {
        const holeIdsForLoop = loopHoleRows
          .filter((loopHole) => loopHole.loop_id === loop.id)
          .sort((a, b) => a.position - b.position)
          .map((loopHole) => holeRows.find((hole) => hole.id === loopHole.hole_id)?.number)
          .filter((value): value is number => typeof value === 'number');

        return {
          id: loop.id,
          name: loop.name,
          loopType: loop.loop_type,
          holeNumbers: holeIdsForLoop.join(', '),
        };
      });

      const holeRowsView = holeRows.map((hole) => ({
        number: hole.number,
        par: hole.par,
        stroke_index: hole.stroke_index,
        distance_meters: hole.distance_meters?.toString() ?? '—',
      }));

      setInitialData({
        course,
        tees: teeDrafts,
        holes: holeDrafts,
        loops: loopDrafts,
      });
      setTeeCount(teeDrafts.length);
      setLoopCount(loopDrafts.length);
      setStructureView({
        teeLabels,
        loopCards,
        holeRows: holeRowsView,
      });
      setLoading(false);
    }

    void loadCourse();
  }, [courseId]);

  async function saveWhsRatings() {
    setWhsError(null);
    setWhsSuccess(null);

    for (const row of whsRows) {
      if (row.slope.trim() !== '') {
        const slopeNum = Number(row.slope);
        if (!Number.isInteger(slopeNum) || slopeNum < 55 || slopeNum > 155) {
          setWhsError(`Slope rating voor ${row.label} moet een geheel getal tussen 55 en 155 zijn.`);
          return;
        }
      }
      if (row.rating.trim() !== '' && !/^\d{1,3}(\.\d)?$/.test(row.rating.trim())) {
        setWhsError(`Course rating voor ${row.label} moet een getal zijn met maximaal 1 decimaal (bijv. 71.4).`);
        return;
      }
    }

    setWhsSaving(true);
    const supabase = getSupabaseBrowser();

    for (const row of whsRows) {
      const { error: updateError } = await supabase
        .from('tees')
        .update({
          slope_rating: row.slope.trim() === '' ? null : Number(row.slope),
          course_rating: row.rating.trim() === '' ? null : Number(row.rating),
        })
        .eq('id', row.id);

      if (updateError) {
        setWhsError(`Opslaan mislukt voor ${row.label}: ${updateError.message}`);
        setWhsSaving(false);
        return;
      }
    }

    setWhsSuccess('Slope en course rating opgeslagen.');
    setWhsSaving(false);
  }

  return (
    <main className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-content">Golfbaan bewerken</h1>
            <p className="text-sm text-content-muted mt-1">
              Alleen de eigenaar kan deze baan aanpassen.
            </p>
          </div>

          <Link
            href={`/${locale}/course`}
            className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-content-secondary text-sm"
          >
            Terug naar beheer
          </Link>
        </div>

        {courseHeader && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
              <p className="text-xs text-content-muted uppercase tracking-wide">Baan</p>
              <p className="text-content font-semibold mt-1 truncate">{courseHeader.name}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
              <p className="text-xs text-content-muted uppercase tracking-wide">Holes</p>
              <p className="text-2xl font-bold text-content mt-1">{courseHeader.holes_count}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
              <p className="text-xs text-content-muted uppercase tracking-wide">Teeboxen</p>
              <p className="text-2xl font-bold text-content mt-1">{teeCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
              <p className="text-xs text-content-muted uppercase tracking-wide">Lussen</p>
              <p className="text-2xl font-bold text-content mt-1">{loopCount}</p>
            </div>
          </div>
        )}

        {courseHeader && !loading && !error && (
          <div className="rounded-2xl border border-border bg-surface-2 p-5 md:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-content">Structuur in één oogopslag</h2>
              <p className="text-sm text-content-muted mt-1">
                Dit is de huidige indeling van de baan. Alleen de eigenaar kan deze gegevens aanpassen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <p className="text-sm font-medium text-content">Teeboxen</p>
                <div className="flex flex-wrap gap-2">
                  {structureView.teeLabels.length === 0 ? (
                    <span className="text-sm text-content-muted">Geen teeboxen</span>
                  ) : (
                    structureView.teeLabels.map((label) => (
                      <span key={label} className="text-xs px-2.5 py-1 rounded-md bg-surface-3 text-content-secondary">
                        {label}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <p className="text-sm font-medium text-content">Laatste status</p>
                <p className="text-sm text-content-muted">
                  Submit/publicatie komt later. Voor nu is deze baan alleen zichtbaar en bewerkbaar voor de eigenaar.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-content">WHS-ratings per tee</p>
                <p className="text-xs text-content-muted mt-0.5">
                  Naam en kleur van de tee komen uit de import. Vul hier alleen de slope rating (55–155) en
                  course rating (bijv. 71.4) in — de rest hoeft niet opnieuw ingevoerd te worden.
                </p>
              </div>

              {whsRows.length === 0 ? (
                <p className="text-sm text-content-muted">Geen teeboxen om te beoordelen.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1 text-xs uppercase tracking-wide text-content-muted">
                    <span>Tee</span>
                    <span>Slope</span>
                    <span>Course rating</span>
                  </div>
                  {whsRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                      <span className="text-sm text-content-secondary truncate">{row.label}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={55}
                        max={155}
                        step={1}
                        placeholder="113"
                        value={row.slope}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWhsRows((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, slope: value } : r))
                          );
                        }}
                        className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="71.4"
                        value={row.rating}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWhsRows((prev) =>
                            prev.map((r, i) => (i === index ? { ...r, rating: value } : r))
                          );
                        }}
                        className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-content"
                      />
                    </div>
                  ))}
                </div>
              )}

              {whsError && <p className="text-sm text-red-400">{whsError}</p>}
              {whsSuccess && <p className="text-sm text-green-400">{whsSuccess}</p>}

              <button
                type="button"
                onClick={() => void saveWhsRatings()}
                disabled={whsSaving || whsRows.length === 0}
                className="px-4 py-2 rounded-xl bg-surface-4 hover:bg-surface-3 text-content text-sm disabled:opacity-50"
              >
                {whsSaving ? 'Opslaan...' : 'WHS-ratings opslaan'}
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-content">Lussen</p>
              <div className="space-y-2">
                {structureView.loopCards.length === 0 ? (
                  <p className="text-sm text-content-muted">Geen lussen aanwezig.</p>
                ) : (
                  structureView.loopCards.map((loop) => (
                    <div key={loop.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-content">{loop.name}</p>
                          <p className="text-xs text-content-muted mt-0.5">
                            {loop.loopType}
                          </p>
                        </div>
                        <span className="text-xs text-content-muted">{loop.holeNumbers.split(',').filter(Boolean).length} holes</span>
                      </div>
                      <p className="text-xs text-content-muted mt-2 break-words">{loop.holeNumbers || 'Geen holes gekoppeld'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-content">Holes</p>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-4 bg-surface-2 px-4 py-2 text-xs uppercase tracking-wide text-content-muted">
                  <span>Nr</span>
                  <span>Par</span>
                  <span>SI</span>
                  <span>Meter</span>
                </div>
                <div className="divide-y divide-border bg-surface">
                  {structureView.holeRows.map((hole) => (
                    <div key={hole.number} className="grid grid-cols-4 px-4 py-2 text-sm text-content-secondary">
                      <span>{hole.number}</span>
                      <span>{hole.par}</span>
                      <span>{hole.stroke_index}</span>
                      <span>{hole.distance_meters}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-surface-2 p-5 md:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-content-muted text-sm">
              <span className="w-4 h-4 border-2 border-border-strong border-t-transparent rounded-full animate-spin" />
              Laden...
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : courseHeader && initialData ? (
            <CourseBuilderForm
              locale={locale}
              mode="edit"
              initialData={initialData}
              onCancel={() => window.history.back()}
              onSaved={() => {
                window.location.href = `/${locale}/course`;
              }}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
