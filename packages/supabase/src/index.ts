/**
 * OpenTour — Gedeelde Supabase client
 * Gebruikt door web app en scorer PWA
 *
 * BELANGRIJK: gebruik altijd de anon_key in de browser.
 * De service_role_key is alleen voor server-side code (Next.js API routes).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase omgevingsvariabelen ontbreken. Controleer NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Browser/PWA client — gebruikt anon key, RLS actief
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side client — alleen in Next.js API routes gebruiken
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ontbreekt. Nooit client-side gebruiken!');
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Leaderboard ophalen: via Cloudflare Worker (gecached), fallback naar Supabase direct
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

  // Fallback: direct naar Supabase (langzamer, geen cache)
  const { data, error } = await supabase
    .from('tournament_leaderboard')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}
