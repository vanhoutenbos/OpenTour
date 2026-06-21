/**
 * OpenTour — Publiek leaderboard
 * Route: /[locale]/tournament/[id]
 *
 * - Geen authenticatie vereist
 * - Polling elke 30 seconden via Cloudflare Worker (cache 30s)
 * - Responsive: 360px telefoon t/m 4K TV
 * - Pauzebanner als toernooi status = 'paused'
 */

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
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, description')
    .eq('id', params.id)
    .single();

  return {
    title: tournament ? `${tournament.name} — OpenTour` : 'Leaderboard — OpenTour',
    description: tournament?.description ?? 'Live golf leaderboard',
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
            <p className="text-sm text-gray-400">
              {t(`format.${tournament.format}`)} · {t(`scoring.${tournament.scoring_type}`)}
            </p>
          </div>
          {tournament.status === 'active' && <LiveBadge />}
        </div>
      </div>

      {/* Pauzebanner */}
      {tournament.status === 'paused' && tournament.pause_reason && (
        <PauseBanner reason={tournament.pause_reason} />
      )}

      {/* Leaderboard — client component voor polling */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardClient
            tournamentId={params.id}
            tournament={tournament as Tournament}
            isActive={tournament.status === 'active'}
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
