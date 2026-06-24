'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string | undefined } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let listenerTriggered = false;

    const loadDashboard = async (userId: string, email: string | undefined) => {
      console.log('[Dashboard] Loading tournaments for user:', userId);
      setUser({ email });
      const { data: rows } = await supabase
        .from('tournaments')
        .select('id, name, status, format, start_date, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      setTournaments((rows as Tournament[]) ?? []);
      setLoading(false);
    };

    // Luister op auth state changes - vangt ook sessie op die net via cookie binnenkwam
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Dashboard] Auth state change:', { event, hasSession: !!session });
      listenerTriggered = true;
      
      if (session?.user) {
        console.log('[Dashboard] ✅ Session gevonden via listener');
        loadDashboard(session.user.id, session.user.email ?? undefined);
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' && !session) {
        console.log('[Dashboard] ❌ No session - redirect naar login');
        router.replace('/nl/login');
      }
    });

    // Check ook direct de huidige sessie
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Dashboard] Direct getSession check:', { hasSession: !!session, listenerTriggered });
      
      if (session?.user) {
        console.log('[Dashboard] ✅ Session gevonden via getSession');
        if (!listenerTriggered) {
          loadDashboard(session.user.id, session.user.email ?? undefined);
        }
      } else if (!listenerTriggered) {
        // Geen sessie gevonden - wacht op listener (max 3 seconden)
        console.log('[Dashboard] ⏳ Wacht op auth state listener...');
        const timeout = setTimeout(() => {
          if (!listenerTriggered) {
            console.log('[Dashboard] ❌ Timeout - nog steeds geen sessie');
            setLoading(false);
            router.replace('/nl/login');
          }
        }, 3000);
        
        return () => clearTimeout(timeout);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    console.log('[Dashboard] User logout clicked');
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
            href="/nl/tournament/new"
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
              href="/nl/tournament/new"
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
                          ? new Date(t.start_date).toLocaleDateString('nl-NL')
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
