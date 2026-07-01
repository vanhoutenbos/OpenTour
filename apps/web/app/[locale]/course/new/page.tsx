'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CourseBuilderForm } from '@/components/course/CourseBuilderForm';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface CourseSummary {
  id: string;
  name: string;
  location: string | null;
  country: string;
  holes_count: number;
  created_at: string;
}

export default function NewCoursePage() {
  const params = useParams();
  const locale = ((params.locale as string) || 'nl').toLowerCase();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const loadOwnCourses = async (uid: string) => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('courses')
      .select('id, name, location, country, holes_count, created_at')
      .eq('created_by', uid)
      .order('created_at', { ascending: false })
      .limit(8);

    setCourses((data as CourseSummary[]) ?? []);
  };

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadOwnCourses(data.user.id);
      }
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Aanmaken golfbanen</h1>
            <p className="text-sm text-gray-400 mt-1">
              Bouw je baan handmatig op met teeboxen, lussen en holes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/course`}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
            >
              Naar beheer
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
            >
              Naar dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-6">
          <CourseBuilderForm
            locale={locale}
            onCreated={() => {
              if (userId) {
                void loadOwnCourses(userId);
              }
            }}
          />
        </div>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Jouw recente banen</h2>

          {courses.length === 0 ? (
            <p className="text-sm text-gray-400">Je hebt nog geen banen aangemaakt.</p>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{course.name}</p>
                    <p className="text-xs text-gray-500">
                      {course.location || 'Locatie onbekend'} · {course.country} · {course.holes_count} holes
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">Privé</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
