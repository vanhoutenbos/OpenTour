import { getSupabaseBrowser } from '@/lib/supabase-browser';

export type SeedingMethod = 'random' | 'handicap_asc' | 'handicap_desc';

export interface LadderSeedOptions {
  tournamentId: string;
  method: SeedingMethod;
}

export async function ladderSeedRungs(options: LadderSeedOptions): Promise<void> {
  const { tournamentId, method } = options;

  const supabase = getSupabaseBrowser();

  const { error } = await supabase.rpc('ladder_seed_rungs', {
    p_tournament_id: tournamentId,
    p_seeding_method: method,
  });

  if (error) {
    throw new Error(`Ladder seeding failed: ${error.message}`);
  }
}
