import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;

  // createBrowserClient van @supabase/ssr beheert cookies automatisch
  // correct zodat middleware (createServerClient) dezelfde sessie leest.
  // Geen custom storage nodig — dat verstoort de interne cookie namen.
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
