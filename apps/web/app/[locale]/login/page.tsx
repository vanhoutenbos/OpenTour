'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

const IS_DEV = process.env.NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK === 'true';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devLoading, setDevLoading] = useState(false);

  const handleLogin = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://open-tour-web.vercel.app/auth/callback',
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

    const res = await fetch('/api/dev-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (data.success) {
      const supabase = getSupabaseBrowser();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        setError(`Session instellen mislukt: ${sessionError.message}`);
      } else {
        window.location.href = '/nl/dashboard';
      }
    } else {
      setError(data.error ?? 'Dev login mislukt');
    }
    setDevLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
              We hebben een inloglink gestuurd naar <strong className="text-white">{email}</strong>.
              Klik op de link om in te loggen.
            </p>
            <p className="text-gray-500 text-xs mt-4">
              Link is 24 uur geldig. Geen e-mail ontvangen? Check je spam.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Inloggen</h2>
            <p className="text-gray-400 text-sm mb-6">
              Voer je e-mailadres in — we sturen je een inloglink.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">E-mailadres</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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

              <button
                onClick={handleLogin}
                disabled={loading || !email}
                className="w-full py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50
                           text-white font-semibold rounded-xl transition-colors"
              >
                {loading ? 'Versturen...' : 'Stuur inloglink →'}
              </button>

              {/* Dev-only: direct inloggen zonder e-mail */}
              {IS_DEV && (
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-yellow-500 mb-2">⚠️ Development only</p>
                  <button
                    onClick={handleDevLink}
                    disabled={devLoading || !email}
                    className="w-full py-2 bg-yellow-800 hover:bg-yellow-700 disabled:opacity-50
                               text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {devLoading ? 'Bezig met inloggen...' : 'Direct inloggen (geen e-mail)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
