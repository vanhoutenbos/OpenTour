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

  const { user, loading: authLoading, degraded } = useAuthSession();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
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
  const showOutageNotice = (degraded && !user) || dataError;

  const statusLabel: Record<string, { label: string; className: string }> = {
    draft:    { label: 'Concept',     className: 'bg-surface-3 text-content-body' },
    active:   { label: 'Actief',      className: 'bg-emerald-900/30 text-emerald-300' },
    paused:   { label: 'Gepauzeerd',  className: 'bg-amber-900/20 text-amber-300' },
    finished: { label: 'Afgelopen',   className: 'bg-blue-900/20 text-blue-300' },
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-content-muted text-body">Laden...</p>
      </main>
    );
  }

  if (showOutageNotice && !user) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <p className="text-content-muted text-body text-center max-w-sm">{tErrors('supabase_outage')}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-admin mx-auto px-6 py-12">
        {/* Outage notice */}
        {showOutageNotice && (
          <div className="mb-8 px-5 py-4 rounded-card text-sm bg-brand-danger/8 text-brand-danger border border-brand-danger/15">
            {tErrors('supabase_outage')}
          </div>
        )}

        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-label text-content-muted mb-2">Mijn toernooien</p>
            <h1 className="text-heading font-serif text-content">Dashboard</h1>
          </div>
          <Link
            href={`/${locale}/tournament/new`}
            className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-button bg-brand-primary hover:bg-brand-primary-hover text-content-inverse text-sm font-semibold transition-colors"
          >
            + Nieuw toernooi
          </Link>
        </div>

        {/* Getting started link */}
        <div className="mb-10">
          <Link
            href={`/${locale}/dashboard/getting-started`}
            className="text-sm text-content-muted hover:text-brand-primary transition-colors"
          >
            {t('gettingStartedLink')}
          </Link>
        </div>

        {/* Empty state */}
        {tournaments.length === 0 ? (
          <div className="text-center py-20 border border-border rounded-card bg-surface-2">
            <span className="text-5xl block mb-4">🏌️</span>
            <h3 className="text-subheading font-serif text-content mb-2">Nog geen toernooien</h3>
            <p className="text-body text-content-muted mb-8 max-w-sm mx-auto">
              Maak je eerste toernooi aan en deel het leaderboard met deelnemers.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href={`/${locale}/tournament/new`}
                className="px-6 py-3 rounded-button bg-brand-primary hover:bg-brand-primary-hover text-content-inverse font-semibold transition-colors"
              >
                Toernooi aanmaken →
              </Link>
              <Link
                href={`/${locale}/dashboard/getting-started`}
                className="px-6 py-3 rounded-button border border-border hover:border-border-strong text-content-secondary hover:text-content font-semibold transition-colors"
              >
                {t('gettingStartedLink')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile CTA */}
            <div className="sm:hidden mb-6">
              <Link
                href={`/${locale}/tournament/new`}
                className="inline-flex items-center px-5 py-2.5 rounded-button bg-brand-primary hover:bg-brand-primary-hover text-content-inverse text-sm font-semibold transition-colors w-full justify-center"
              >
                + Nieuw toernooi
              </Link>
            </div>

            {/* Tournament list — soft cards */}
            <div className="space-y-3">
              {tournaments.map((t) => {
                const s = statusLabel[t.status] ?? statusLabel['draft']!;
                return (
                  <Link
                    key={t.id}
                    href={`/${locale}/tournament/${t.id}/manage`}
                    className="block bg-surface-2 border border-border hover:border-border-strong rounded-card p-5 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-content text-lg group-hover:text-brand-primary transition-colors truncate">
                          {t.name}
                        </h3>
                        <p className="text-sm text-content-muted mt-1">
                          {t.format} ·{' '}
                          {t.start_date
                            ? format.dateTime(new Date(t.start_date), { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Datum nog niet ingesteld'}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium tracking-wide ${s.className}`}>
                        {s.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
