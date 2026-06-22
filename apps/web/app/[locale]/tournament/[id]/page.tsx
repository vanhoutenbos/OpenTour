import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@opentour/supabase';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { PauseBanner } from '@/components/leaderboard/PauseBanner';
import { LiveBadge } from '@/components/leaderboard/LiveBadge';
import type { Tournament } from '@opentour/types';

interface Props {
  params: { locale: string; id: string };
}

export async function generateMetadata({ params }: Props) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select('name, description')
    .eq('id', params.id)
    .single();

  // data is null als toernooi niet gevonden — veilig destructuren
  const name = data?.name ?? null;
  const description = data?.description ?? null;

  return {
    title: name ? `${name} — OpenTour` : 'Leaderboard — OpenTour',
    description: description ?? 'Live golf leaderboard',
  };
}

export default async function LeaderboardPage({ params }: Props) {
  const t = await getTranslations('leaderboard');
  const supabase = createServerClient();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .eq('is_public', true)
    .single();

  if (error || !tournament) {
    notFound();
  }

  // TypeScript weet na de notFound() check zeker dat tournament niet null is
  const safeToernooi = tournament as Tournament;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{safeToernooi.name}</h1>
            <p className="text-sm text-gray-400">
              {safeToernooi.format} · {safeToernooi.scoring_type}
            </p>
          </div>
          {safeToernooi.status === 'active' && <LiveBadge />}
        </div>
      </div>

      {/* Pauzebanner */}
      {safeToernooi.status === 'paused' && safeToernooi.pause_reason && (
        <PauseBanner reason={safeToernooi.pause_reason} />
      )}

      {/* Leaderboard */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardClient
            tournamentId={params.id}
            tournament={safeToernooi}
            isActive={safeToernooi.status === 'active'}
          />
        </Suspense>
      </div>
    </main>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-800 rounded-lg" />
      ))}
    </div>
  );
}
