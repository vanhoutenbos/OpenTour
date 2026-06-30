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
  const [error, setError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    // Als er al een sessie is (bijv. na F5 op login pagina), direct doorsturen
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace(`/${locale}/dashboard`);
    });

    // Vang SIGNED_IN op — vuurt na setSession() of na magic link callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace(`/${locale}/dashboard`);
      }
    });

    return () => subscription.unsubscribe();
  }, [locale, router]);

  const handleLogin = async () => {
    if (!email) return;
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
        ? 'Wow Dechambeau, iets rustiger oké? Probeer het over 5 minuten opnieuw.'
        : 'Inloggen mislukt. Controleer je e-mailadres.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleDevLink = async () => {
    if (!email) return;
    setDevLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dev-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? 'Dev login mislukt');
        setDevLoading(false);
        return;
      }

      // setSession() initialiseert de browser client sessie correct
      // en triggert onAuthStateChange met SIGNED_IN → redirect naar dashboard
      const supabase = getSupabaseBrowser();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        setError(`Sessie instellen mislukt: ${sessionError.message}`);
        setDevLoading(false);
      }
      // Bij succes: onAuthStateChange SIGNED_IN doet de redirect
    } catch {
      setError('Verbindingsfout — probeer opnieuw');
      setDevLoading(false);
    }
  };

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
              We stuurden een inloglink naar{' '}
              <strong className="text-white">{email}</strong>.
            </p>
            <p className="text-gray-500 text-xs mt-4">
              Link is 24 uur geldig. Geen e-mail? Check je spam.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Inloggen</h2>
            <p className="text-gray-400 text-sm mb-6">
              {IS_DEV ? 'Voer een e-mailadres in en log direct in.' : 'Voer je e-mailadres in — we sturen je een inloglink.'}
            </p>

            <div className="space-y-4">
              {IS_DEV && (
                <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
                  <p className="text-yellow-500 text-xs font-medium">⚠️ Development modus — geen e-mail nodig</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">E-mailadres</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (IS_DEV ? handleDevLink() : handleLogin())}
                  placeholder="jij@voorbeeld.nl"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                             placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {IS_DEV ? (
                <button
                  onClick={handleDevLink}
                  disabled={devLoading || !email}
                  className="w-full py-3 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50
                             text-white font-semibold rounded-xl transition-colors"
                >
                  {devLoading ? 'Bezig met inloggen...' : 'Direct inloggen →'}
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={loading || !email}
                  className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50
                             text-white font-semibold rounded-xl transition-colors"
                >
                  {loading ? 'Versturen...' : 'Stuur inloglink →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
