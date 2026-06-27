import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Sla sessie op in cookies zodat middleware hem kan lezen én refreshen
        // localStorage werkt niet server-side en verliest sync met middleware
        storageKey: 'sb-session',
        storage: {
          getItem: (key) => {
            if (typeof document === 'undefined') return null;
            const match = document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${key}=`));
            if (!match) return null;
            try {
              return decodeURIComponent(match.split('=').slice(1).join('='));
            } catch {
              return null;
            }
          },
          setItem: (key, value) => {
            if (typeof document === 'undefined') return;
            // 400 dagen — gebruiker blijft altijd ingelogd
            const maxAge = 400 * 24 * 60 * 60;
            document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
          },
          removeItem: (key) => {
            if (typeof document === 'undefined') return;
            document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
          },
        },
        // Automatisch token refreshen als hij bijna verlopen is
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  return client;
}
