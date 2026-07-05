'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { useAuthSession } from '@/lib/useAuthSession';

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
  const params = useParams();
  const locale = (params.locale as string) || 'nl';
  const format = useFormatter();
  const t = useTranslations('dashboard');
  const tErrors = useTranslations('errors');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  // Server-geverifieerde login-status i.p.v. lokale getSession()/
  // onAuthStateChange. Die laatste kon "ingelogd" rapporteren op basis van
  // verouderde/nog-niet-gesynchroniseerde lokale storage terwijl de server
  // (middleware) de cookie net had ververst — vandaar dat een refresh soms
  // ten onrechte naar /login stuurde. /api/auth/session is de autoriteit.
  //
  // Belangrijk: als de auth-check zelf hikt (degraded) maar we al een
  // bekende, nog geldige user hebben, blokkeren we niets — de rest van de
  // pagina werkt gewoon door op basis van dat token. Alleen als Supabase in
  // het algemeen niet reageert (de data-query hieronder faalt ook) tonen we
  // een storingsmelding. Eén losse auth-hikje is geen reden om iemand die
  // verder prima werkt tegen te houden.
  const { user, loading: authLoading, degraded } = useAuthSession();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Geen bekende user. Als dat komt door een tijdelijke storing
      // (degraded) i.p.v. een bevestigd "niet ingelogd", wachten we nog
      // even in plaats van meteen naar login te sturen.
      if (degraded) return;
      if (!redirected) {
        setRedirected(true);
        router.replace(`/${locale}/login`);
      }
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowser();

    supabase
      .from('tournaments')
      .select('id, name, status, format, start_date, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .then(({ data: rows, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[dashboard] tournaments query error:', error);
          setDataError(true);
        } else {
          setDataError(false);
          setTournaments((rows as Tournament[]) ?? []);
        }
        setTournamentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, degraded, user, locale, router, redirected]);

  const loading = authLoading || (!!user && tournamentsLoading);
  // Storing tonen op de pagina zelf alleen als er nog steeds geen user bekend
  // is (dus zelfs de laatst bekende staat ontbreekt) OF als de daadwerkelijke
  // data-call ook faalt — niet bij een geïsoleerd auth-check-hikje.
  const showOutageNotice = (degraded && !user) || dataError;

  const statusLabel: Record<string, { label: string; className: string }> = {
    draft:    { label: 'Concept',     className: 'bg-surface-3 text-content-secondary' },
    active:   { label: 'Actief',      className: 'bg-green-800 text-green-300' },
    paused:   { label: 'Gepauzeerd',  className: 'bg-yellow-800 text-yellow-300' },
    finished: { label: 'Afgelopen',   className: 'bg-blue-900 text-blue-300' },
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-content-muted">Laden...</p>
      </main>
    );
  }

  // Geen enkele bekende gebruiker (ook niet van een eerdere, nog geldige
  // sessie) en de auth-check faalt door een storing: niets te tonen, geen
  // reden om naar login te sturen (dat zou een gok zijn, geen feit).
  if (showOutageNotice && !user) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <p className="text-content-muted text-center max-w-sm">{tErrors('supabase_outage')}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {showOutageNotice && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-amber-900/40 text-amber-200 border border-amber-800/60">
            {tErrors('supabase_outage')}
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-content">Mijn toernooien</h2>
          <Link
            href={`/${locale}/tournament/new`}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm
                       font-semibold rounded-xl transition-colors"
          >
            + Nieuw toernooi
          </Link>
        </div>
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard/getting-started`}
            className="text-sm text-content-muted hover:text-green-400 transition-colors"
          >
            {t('gettingStartedLink')}
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border-strong rounded-2xl">
            <span className="text-5xl">🏌️</span>
            <h3 className="text-lg font-semibold text-content mt-4 mb-2">Nog geen toernooien</h3>
            <p className="text-content-muted text-sm mb-6">
              Maak je eerste toernooi aan en deel het leaderboard met deelnemers.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href={`/${locale}/tournament/new`}
                className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
              >
                Toernooi aanmaken →
              </Link>
              <Link
                href={`/${locale}/dashboard/getting-started`}
                className="px-6 py-3 border border-border-strong hover:border-border-strong text-content-secondary hover:text-content
                           font-semibold rounded-xl transition-colors"
              >
                {t('gettingStartedLink')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => {
              const s = statusLabel[t.status] ?? statusLabel['draft']!;
              return (
                <Link
                  key={t.id}
                  href={`/${locale}/tournament/${t.id}/manage`}
                  className="block bg-surface-2 border border-border hover:border-border-strong
                             rounded-2xl p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-content">{t.name}</h3>
                      <p className="text-sm text-content-muted mt-0.5">
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
