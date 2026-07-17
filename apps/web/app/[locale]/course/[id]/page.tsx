'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CourseBuilderForm, type CourseBuilderInitialData } from '@/components/course/CourseBuilderForm';
import { TeeManagerSection, type TeeRecord } from '@/components/course/TeeManagerSection';
import { LoopManagerSection, type LoopRecord } from '@/components/course/LoopManagerSection';
import { LoopRatingsSection, type LoopSummary, type LoopTeeRatingRecord } from '@/components/course/LoopRatingsSection';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface CourseHeader {
  id: string;
  name: string;
  location: string | null;
  country: string;
  holes_count: number;
}

type TeeRow = TeeRecord;

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
  is_default: boolean | null;
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
  const [tees, setTees] = useState<TeeRecord[]>([]);
  const [loops, setLoops] = useState<LoopRecord[]>([]);
  const [holeRefs, setHoleRefs] = useState<{ id: string; number: number }[]>([]);
  const [loopSummaries, setLoopSummaries] = useState<LoopSummary[]>([]);
  const [loopTeeRatings, setLoopTeeRatings] = useState<LoopTeeRatingRecord[]>([]);
  const [structureView, setStructureView] = useState<{
    holeRows: {
      number: number;
      par: 3 | 4 | 5;
      stroke_index: number;
      distance_meters: string;
    }[];
  }>({ holeRows: [] });

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

      const [{ data: course }, { data: tees }, { data: holes }, { data: loops }, { data: loopHoles }, { data: holeTeeDistances }, { data: loopTeeRatingRows }] = await Promise.all([
        supabase
          .from('courses')
          .select('id, name, location, country, holes_count')
          .eq('id', courseId)
          .eq('created_by', authData.user.id)
          .maybeSingle(),
        supabase
          .from('tees')
          .select('id, external_id, name, color, slope_rating, course_rating, gender')
          .eq('course_id', courseId)
          .order('created_at', { ascending: true }),
        supabase
          .from('holes')
          .select('id, number, par, stroke_index, distance_meters')
          .eq('course_id', courseId)
          .order('number', { ascending: true }),
        supabase
          .from('loops')
          .select('id, name, loop_type, tee_id, is_default')
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
        supabase
          .from('loop_tee_ratings')
          .select('id, loop_id, tee_id, slope_rating, course_rating')
          .in('loop_id', (await supabase.from('loops').select('id').eq('course_id', courseId)).data?.map((row) => row.id) ?? []),
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
        gender: tee.gender,
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

        return {
          name: loop.name,
          hole_numbers: holeIdsForLoop,
        };
      });

      setTees(teeRows);
      setHoleRefs(holeRows.map((hole) => ({ id: hole.id, number: hole.number })));
      setLoopSummaries(loopRows.map((loop) => ({ id: loop.id, name: loop.name, loop_type: loop.loop_type })));
      setLoopTeeRatings((loopTeeRatingRows as LoopTeeRatingRecord[] | null) ?? []);

      const loopRecords: LoopRecord[] = loopRows.map((loop) => {
        const holeNumbersForLoop = loopHoleRows
          .filter((loopHole) => loopHole.loop_id === loop.id)
          .sort((a, b) => a.position - b.position)
          .map((loopHole) => holeRows.find((hole) => hole.id === loopHole.hole_id)?.number)
          .filter((value): value is number => typeof value === 'number');

        return {
          id: loop.id,
          name: loop.name,
          loop_type: loop.loop_type,
          tee_id: loop.tee_id,
          is_default: loop.is_default ?? false,
          holeNumbers: holeNumbersForLoop,
        };
      });
      setLoops(loopRecords);

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
      setLoopCount(loopRecords.length);
      setStructureView({
        holeRows: holeRowsView,
      });
      setLoading(false);
    }

    void loadCourse();
  }, [courseId]);



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

            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <p className="text-sm font-medium text-content">Laatste status</p>
              <p className="text-sm text-content-muted">
                Submit/publicatie komt later. Voor nu is deze baan alleen zichtbaar en bewerkbaar voor de eigenaar.
              </p>
            </div>

            <TeeManagerSection
              courseId={courseId}
              initialTees={tees}
              onTeesChanged={(updated) => {
                setTees(updated);
                setTeeCount(updated.length);
              }}
            />

            <LoopRatingsSection
              loops={loopSummaries}
              tees={tees}
              initialRatings={loopTeeRatings}
            />

            <LoopManagerSection
              courseId={courseId}
              holes={holeRefs}
              tees={tees.map((tee) => ({
                id: tee.id,
                label: [tee.color ?? tee.name ?? tee.external_id, tee.gender ? `(${tee.gender})` : null]
                  .filter(Boolean)
                  .join(' '),
              }))}
              initialLoops={loops}
              onLoopsChanged={(updated) => {
                setLoops(updated);
                setLoopCount(updated.length);
              }}
            />

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