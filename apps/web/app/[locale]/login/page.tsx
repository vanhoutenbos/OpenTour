'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const IS_DEV = process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK === 'true';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDevLogin = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError(null);

    try {
      // Stap 1: server maakt user aan en geeft credentials terug
      const res = await fetch('/api/dev-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Inloggen mislukt');
        setLoading(false);
        return;
      }

      // Stap 2: log direct in via de browser client
      const supabase = getSupabaseBrowser();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError || !signInData.session) {
        setError(`Inloggen mislukt: ${signInError?.message ?? 'geen sessie'}`);
        setLoading(false);
        return;
      }

      // Wacht kort zodat de browser client de cookies kan schrijven
      // voordat we een page reload doen (document.cookie is synchroon
      // maar de supabase storage.setItem is intern async)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Hard redirect — browser stuurt cookies mee, middleware valideert
      window.location.href = `/${locale}/dashboard`;

    } catch {
      setError('Verbindingsfout — probeer opnieuw');
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setError(error.message.includes('rate limit')
        ? 'Te veel pogingen. Probeer het over 5 minuten opnieuw.'
        : 'Inloggen mislukt. Controleer je e-mailadres.');
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-green-900/30 border border-green-700 rounded-2xl p-6 text-center">
          <span className="text-4xl">📧</span>
          <h2 className="text-lg font-semibold text-white mt-3 mb-2">Check je e-mail</h2>
          <p className="text-gray-400 text-sm">
            We stuurden een inloglink naar{' '}
            <strong className="text-white">{email}</strong>.
          </p>
          <p className="text-gray-500 text-xs mt-4">
            Link is 24 uur geldig. Geen e-mail? Check je spam.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🏌️</span>
          <h1 className="text-2xl font-bold text-white mt-2">
            Open<span className="text-green-500">Tour</span>
          </h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {IS_DEV && (
            <div className="mb-4 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
              <p className="text-yellow-500 text-xs font-medium">⚠️ Development modus</p>
            </div>
          )}

          <h2 className="text-lg font-semibold text-white mb-1">Inloggen</h2>
          <p className="text-gray-400 text-sm mb-6">
            {IS_DEV
              ? 'Voer een e-mailadres in en log direct in.'
              : 'Voer je e-mailadres in — we sturen je een inloglink.'}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && (IS_DEV ? handleDevLogin() : handleMagicLink())}
                placeholder="jij@voorbeeld.nl"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
                           text-white placeholder-gray-500 focus:outline-none
                           focus:border-green-600 transition-colors"
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {IS_DEV ? (
              <button
                onClick={handleDevLogin}
                disabled={loading || !email}
                className="w-full py-3 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50
                           text-white font-semibold rounded-xl transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Bezig...
                  </>
                ) : 'Direct inloggen →'}
              </button>
            ) : (
              <button
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50
                           text-white font-semibold rounded-xl transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Versturen...
                  </>
                ) : 'Stuur inloglink →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
