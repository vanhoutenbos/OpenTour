import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let _browserClient: ReturnType<typeof createClient<Database>> | null = null;

export function getBrowserClient() {
  if (_browserClient) return _browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase omgevingsvariabelen ontbreken. Controleer NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  _browserClient = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _browserClient;
}

export function createServerClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server Supabase client: SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt. Nooit client-side gebruiken!'
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function fetchLeaderboard(tournamentId: string) {
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/api/leaderboard/${tournamentId}`);
      if (res.ok) return res.json();
    } catch {
      // Worker niet beschikbaar, val terug op Supabase direct
    }
  }

  const { data, error } = await getBrowserClient()
    .from('tournament_leaderboard')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}
