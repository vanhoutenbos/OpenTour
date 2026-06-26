'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const DISALLOWED = /[0O1I]/g;

export default function ScorerPage() {
  const t = useTranslations('scorer');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [code, router, t]);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🏌️</span>
          <h1 className="text-2xl font-bold text-white mt-2">
            Open<span className="text-green-500">Tour</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">{t('page_title')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">{t('code_title')}</h2>
          <p className="text-gray-400 text-sm mb-6">{t('code_description')}</p>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoFocus
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('code_placeholder')}
                maxLength={8}
                className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-4
                           bg-gray-800 border border-gray-700 rounded-xl text-white
                           placeholder-gray-600 focus:outline-none focus:border-green-600
                           transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">{t('code_hint')}</p>
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
