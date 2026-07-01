'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface CourseSummary {
  id: string;
  name: string;
  location: string | null;
  country: string;
  holes_count: number;
  created_at: string;
  is_public: boolean;
}

export default function CoursesPage() {
  const params = useParams();
  const locale = ((params.locale as string) || 'nl').toLowerCase();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function loadCourses() {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError('Je sessie is verlopen. Log opnieuw in.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('courses')
        .select('id, name, location, country, holes_count, created_at, is_public')
        .eq('created_by', authData.user.id)
        .order('created_at', { ascending: false });

      if (queryError) {
        setError('Banen konden niet geladen worden. Probeer opnieuw.');
        setLoading(false);
        return;
      }

      setCourses((data as CourseSummary[]) ?? []);
      setLoading(false);
    }

    void loadCourses();
  }, []);

  const totalHoles = useMemo(() => courses.reduce((sum, course) => sum + course.holes_count, 0), [courses]);

  return (
    <main className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Golfbanen beheren</h1>
            <p className="text-sm text-gray-400 mt-1">Beheer je eigen banen, lussen, teeboxen en holes.</p>
          </div>

          <Link
            href={`/${locale}/course/new`}
            className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-semibold"
          >
            + Baan aanmaken
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Aantal banen</p>
            <p className="text-2xl font-bold text-white mt-1">{courses.length}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Totaal holes</p>
            <p className="text-2xl font-bold text-white mt-1">{totalHoles}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Publicatiestatus</p>
            <p className="text-sm text-gray-300 mt-2">Alle banen zijn eigenaar-gebonden. Submit/publicatie komt later.</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-gray-300">
          Vanuit dit overzicht kun je een baan bewerken als eigenaar of direct opnieuw gebruiken in een nieuw toernooi.
        </div>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              Laden...
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : courses.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-700 rounded-xl">
              <p className="text-gray-300 font-medium">Je hebt nog geen banen aangemaakt.</p>
              <p className="text-gray-500 text-sm mt-1">Start met een baan en gebruik die direct in Nieuw Toernooi.</p>
              <Link
                href={`/${locale}/course/new`}
                className="inline-block mt-4 text-sm text-green-400 hover:text-green-300"
              >
                Eerste baan aanmaken →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{course.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {course.location || 'Locatie onbekend'} · {course.country} · {course.holes_count} holes
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-md border border-gray-700 text-gray-400">
                      {course.is_public ? 'Publiek' : 'Privé'}
                    </span>
                    <Link
                      href={`/${locale}/course/${course.id}`}
                      className="text-xs px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200"
                    >
                      Bewerken
                    </Link>
                    <Link
                      href={`/${locale}/tournament/new`}
                      className="text-xs px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200"
                    >
                      Gebruik in toernooi
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
