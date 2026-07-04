'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

const DISALLOWED = /[0O1I]/g;

interface OwnTournament {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
}

export default function ScorerPage() {
  const t = useTranslations('scorer');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingelogde organisator: eigen toernooien ophalen
  const [ownTournaments, setOwnTournaments] = useState<OwnTournament[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, name, status, start_date')
        .eq('created_by', data.user.id)
        .in('status', ['active', 'draft'])
        .order('start_date', { ascending: false })
        .limit(5);
      if (tournaments && tournaments.length > 0) {
        setIsOrganizer(true);
        setOwnTournaments(tournaments);
      }
    });
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    const cleaned = value.toUpperCase().replace(DISALLOWED, '').slice(0, 8);
    setCode(cleaned);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (code.length !== 8) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error?.includes('verlopen')
            ? t('expired_code')
            : t('invalid_code')
        );
        return;
      }

      if (data.valid && data.tournamentId) {
        router.push(`/${locale}/scorer/${data.tournamentId}`);
      }
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }, [code, locale, router, t]);

  const statusLabel = (status: string) =>
    status === 'active' ? (
      <span className="text-xs font-medium text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">Live</span>
    ) : (
      <span className="text-xs text-content-muted bg-surface-3 px-2 py-0.5 rounded-full">Concept</span>
    );

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <span className="text-4xl">🏌️</span>
          <h1 className="text-2xl font-bold text-content mt-2">
            Open<span className="text-green-500">Tour</span>
          </h1>
          <p className="text-content-muted text-sm mt-2">{t('page_title')}</p>
        </div>

        {/* Eigen toernooien — alleen zichtbaar als organisator */}
        {isOrganizer && (
          <div className="bg-surface-2 border border-border rounded-2xl p-5">
            <p className="text-sm text-content-muted mb-3">Jouw toernooien</p>
            <div className="space-y-2">
              {ownTournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/${locale}/scorer/${t.id}`}
                  className="flex items-center justify-between w-full px-4 py-3 bg-surface-3 hover:bg-surface-4 hover:border-green-700 border border-border-strong rounded-xl transition-colors group"
                >
                  <span className="text-content text-sm font-medium group-hover:text-green-400 transition-colors truncate pr-2">
                    {t.name}
                  </span>
                  {statusLabel(t.status)}
                </Link>
              ))}
            </div>
            <p className="text-xs text-content-muted mt-3 text-center">
              Als organisator kun je direct scores invoeren zonder code.
            </p>
          </div>
        )}

        {/* Code invoer */}
        <div className="bg-surface-2 border border-border rounded-2xl p-6">
          {isOrganizer ? (
            <h2 className="text-sm font-medium text-content-muted mb-4">
              Of voer een toegangscode in
            </h2>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-content mb-1">{t('code_title')}</h2>
              <p className="text-content-muted text-sm mb-6">{t('code_description')}</p>
            </>
          )}

          <div className="space-y-4">
            <div>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoFocus={!isOrganizer}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('code_placeholder')}
                maxLength={8}
                className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-4
                           bg-surface-3 border border-border-strong rounded-xl text-content
                           placeholder-content-muted focus:outline-none focus:border-green-600
                           transition-colors"
              />
              <p className="text-xs text-content-muted mt-2 text-center">{t('code_hint')}</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || code.length !== 8}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:opacity-50
                         text-white font-semibold text-lg rounded-xl transition-colors
                         min-h-[48px] flex items-center justify-center"
            >
              {loading ? (
                <span className="inline-block w-6 h-6 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin" />
              ) : (
                t('start_scoring')
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
