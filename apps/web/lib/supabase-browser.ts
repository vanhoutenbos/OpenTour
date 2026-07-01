import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;

  // createBrowserClient van @supabase/ssr beheert cookies automatisch
  // correct zodat middleware (createServerClient) dezelfde sessie leest.
  // Geen custom storage nodig — dat verstoort de interne cookie namen.
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        maxAge: TEN_YEARS_IN_SECONDS,
      },
    }
  );

  return client;
}
