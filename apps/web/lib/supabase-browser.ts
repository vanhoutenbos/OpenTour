import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (client) return client;
  // createBrowserClient van @supabase/ssr slaat sessie op in cookies (niet localStorage)
  // zodat server components en route handlers de sessie kunnen lezen
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
