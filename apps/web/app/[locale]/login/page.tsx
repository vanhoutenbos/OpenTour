'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const IS_DEV = process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK === 'true';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    // getUser() valideert server-side en refresht token als nodig
    supabase.auth.getUser()
      .then(({ data }) => {
        if (data.user) {
          router.replace(`/${locale}/dashboard`);
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));

    // Vang redirect na echte magic link op
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        router.replace(`/${locale}/dashboard`);
      }
    });

    return () => subscription.unsubscribe();
  }, [locale, router]);

  // Dev: direct inloggen zonder e-mail
  const handleDevLogin = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError(null);

    try {
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

      // Cookies zijn gezet door de server. Hard redirect zodat de
      // browser de nieuwe cookies meestuurt en middleware ze verwerkt.
      window.location.href = `/${locale}/dashboard`;

    } catch {
      setError('Verbindingsfout — probeer opnieuw');
      setLoading(false);
    }
  };

  // Productie: magic link via e-mail
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

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
          <span className="text-sm">Sessie controleren...</span>
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

        {sent ? (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 text-center">
            <span className="text-4xl">📧</span>
            <h2 className="text-lg font-semibold text-white mt-3 mb-2">Check je e-mail</h2>
            <p className="text-gray-400 text-sm">
              We hebben een inloglink gestuurd naar{' '}
              <strong className="text-white">{email}</strong>.
            </p>
            <p className="text-gray-500 text-xs mt-4">
              Link is 24 uur geldig. Geen e-mail? Check je spam.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">

            {IS_DEV && (
              <div className="mb-4 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
                <p className="text-yellow-500 text-xs font-medium">⚠️ Development modus</p>
              </div>
            )}

            <h2 className="text-lg font-semibold text-white mb-1">Inloggen</h2>
            <p className="text-gray-400 text-sm mb-6">
              {IS_DEV
                ? 'Voer een e-mailadres in en log direct in zonder e-mailverificatie.'
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
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                             placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              {IS_DEV ? (
                // Dev modus: alleen directe login knop, geen mail versturen
                <button
                  onClick={handleDevLogin}
                  disabled={loading || !email}
                  className="w-full py-3 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50
                             text-white font-semibold rounded-xl transition-colors"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Direct inloggen →'
                  )}
                </button>
              ) : (
                // Productie: alleen magic link
                <button
                  onClick={handleMagicLink}
                  disabled={loading || !email}
                  className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50
                             text-white font-semibold rounded-xl transition-colors"
                >
                  {loading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Stuur inloglink →'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
