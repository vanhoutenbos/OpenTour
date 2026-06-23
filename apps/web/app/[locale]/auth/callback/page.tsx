'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseBrowser();
        
        // Laat Supabase de URL parameters verwerken
        const { error: authError } = await supabase.auth.exchangeCodeForSession();
        
        if (authError) {
          console.error('Auth error:', authError);
          setError(authError.message || 'Inloggen mislukt');
          setLoading(false);
          // Redirect naar login na 3 seconden
          setTimeout(() => router.push('/nl/login'), 3000);
          return;
        }

        // Controleer of gebruiker ingelogd is
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          // Redirect naar dashboard
          router.push('/nl/dashboard');
        } else {
          setError('Gebruiker niet gevonden');
          setTimeout(() => router.push('/nl/login'), 3000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Er is iets misgegaan');
        setLoading(false);
        setTimeout(() => router.push('/nl/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-400 mb-4">{error}</p>
            <p className="text-gray-400 text-sm">Redirect naar login...</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-gray-400">Inloggen verwerken...</p>
          </>
        )}
      </div>
    </main>
  );
}
