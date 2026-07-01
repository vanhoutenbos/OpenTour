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
          .select('id, external_id, name, color')
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

  return (
    <main className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Golfbaan bewerken</h1>
            <p className="text-sm text-gray-400 mt-1">
              Alleen de eigenaar kan deze baan aanpassen.
            </p>
          </div>

          <Link
            href={`/${locale}/course`}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
          >
            Terug naar beheer
          </Link>
        </div>

        {courseHeader && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Baan</p>
              <p className="text-white font-semibold mt-1 truncate">{courseHeader.name}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Holes</p>
              <p className="text-2xl font-bold text-white mt-1">{courseHeader.holes_count}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Teeboxen</p>
              <p className="text-2xl font-bold text-white mt-1">{teeCount}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Lussen</p>
              <p className="text-2xl font-bold text-white mt-1">{loopCount}</p>
            </div>
          </div>
        )}

        {courseHeader && !loading && !error && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Structuur in één oogopslag</h2>
              <p className="text-sm text-gray-400 mt-1">
                Dit is de huidige indeling van de baan. Alleen de eigenaar kan deze gegevens aanpassen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-2">
                <p className="text-sm font-medium text-white">Teeboxen</p>
                <div className="flex flex-wrap gap-2">
                  {structureView.teeLabels.length === 0 ? (
                    <span className="text-sm text-gray-500">Geen teeboxen</span>
                  ) : (
                    structureView.teeLabels.map((label) => (
                      <span key={label} className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-200">
                        {label}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-2">
                <p className="text-sm font-medium text-white">Laatste status</p>
                <p className="text-sm text-gray-400">
                  Submit/publicatie komt later. Voor nu is deze baan alleen zichtbaar en bewerkbaar voor de eigenaar.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Lussen</p>
              <div className="space-y-2">
                {structureView.loopCards.length === 0 ? (
                  <p className="text-sm text-gray-500">Geen lussen aanwezig.</p>
                ) : (
                  structureView.loopCards.map((loop) => (
                    <div key={loop.id} className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{loop.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {loop.loopType}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">{loop.holeNumbers.split(',').filter(Boolean).length} holes</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 break-words">{loop.holeNumbers || 'Geen holes gekoppeld'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Holes</p>
              <div className="overflow-hidden rounded-xl border border-gray-800">
                <div className="grid grid-cols-4 bg-gray-900 px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
                  <span>Nr</span>
                  <span>Par</span>
                  <span>SI</span>
                  <span>Meter</span>
                </div>
                <div className="divide-y divide-gray-800 bg-gray-950">
                  {structureView.holeRows.map((hole) => (
                    <div key={hole.number} className="grid grid-cols-4 px-4 py-2 text-sm text-gray-200">
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

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
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
