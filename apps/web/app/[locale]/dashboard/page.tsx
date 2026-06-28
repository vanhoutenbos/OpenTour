'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormatter } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface Tournament {
  id: string;
  name: string;
  status: string;
  format: string;
  start_date: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const format = useFormatter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;
    let loaded = false;

    // Tijdelijke debug: welke cookies ziet de browser client?
    console.log('[dashboard] document.cookie keys:', document.cookie.split(';').map(c => c.trim().split('=')[0]));

    const loadDashboard = async (userId: string, email: string | undefined) => {
      if (cancelled || loaded) return;
      loaded = true;
      setUser({ email });
      const { data: rows } = await supabase
        .from('tournaments')
        .select('id, name, status, format, start_date, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setTournaments((rows as Tournament[]) ?? []);
        setLoading(false);
      }
    };

    // getUser() doet een server-roundtrip — werkt aantoonbaar correct
    // (de debug route /api/debug-session bewijst dat de sessie er is).
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      console.log('[dashboard] getUser result:', { userId: data?.user?.id, email: data?.user?.email, error: error?.message });
      if (data.user && !error) {
        loadDashboard(data.user.id, data.user.email ?? undefined);
      } else {
        console.warn('[dashboard] geen user gevonden, redirect naar login');
        window.location.href = '/nl/login';
      }
    }).catch((err) => {
      console.error('[dashboard] getUser() fout:', err);
      if (!cancelled) window.location.href = '/nl/login';
    });

    // Luister ook naar auth events voor logout / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        window.location.href = '/nl/login';
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.replace('/nl/login');
  };

  const statusLabel: Record<string, { label: string; className: string }> = {
    draft:    { label: 'Concept',     className: 'bg-gray-700 text-gray-300' },
    active:   { label: 'Actief',      className: 'bg-green-800 text-green-300' },
    paused:   { label: 'Gepauzeerd',  className: 'bg-yellow-800 text-yellow-300' },
    finished: { label: 'Afgelopen',   className: 'bg-blue-900 text-blue-300' },
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Open<span className="text-green-500">Tour</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Mijn toernooien</h2>
          <Link
            href={`/nl/tournament/new`}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm
                       font-semibold rounded-xl transition-colors"
          >
            + Nieuw toernooi
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <span className="text-5xl">🏌️</span>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Nog geen toernooien</h3>
            <p className="text-gray-400 text-sm mb-6">
              Maak je eerste toernooi aan en deel het leaderboard met deelnemers.
            </p>
            <Link
              href={`/nl/tournament/new`}
              className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
            >
              Toernooi aanmaken →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => {
              const s = statusLabel[t.status] ?? statusLabel['draft']!;
              return (
                <Link
                  key={t.id}
                  href={`/nl/tournament/${t.id}/manage`}
                  className="block bg-gray-900 border border-gray-800 hover:border-gray-600
                             rounded-2xl p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{t.name}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {t.format} ·{' '}
                        {t.start_date
                          ? format.dateTime(new Date(t.start_date), { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Datum nog niet ingesteld'}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
