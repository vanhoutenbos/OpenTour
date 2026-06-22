import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { PauseBanner } from '@/components/leaderboard/PauseBanner';
import { LiveBadge } from '@/components/leaderboard/LiveBadge';

interface Props {
  params: { locale: string; id: string };
}

interface TournamentRow {
  id: string;
  name: string;
  description: string | null;
  format: string;
  scoring_type: string;
  status: string;
  pause_reason: string | null;
  is_public: boolean;
  rounds: number;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

async function getTournament(id: string): Promise<TournamentRow | null> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tournaments?id=eq.${id}&is_public=eq.true&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) return null;
  const rows: TournamentRow[] = await res.json();
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Props) {
  const tournament = await getTournament(params.id);
  return {
    title: tournament ? `${tournament.name} — OpenTour` : 'Leaderboard — OpenTour',
    description: tournament?.description ?? 'Live golf leaderboard',
  };
}

export default async function LeaderboardPage({ params }: Props) {
  const tournament = await getTournament(params.id);

  if (!tournament) notFound();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
            <p className="text-sm text-gray-400">
              {tournament.format} · {tournament.scoring_type}
            </p>
          </div>
          {tournament.status === 'active' && <LiveBadge />}
        </div>
      </div>

      {/* Pauzebanner */}
      {tournament.status === 'paused' && tournament.pause_reason && (
        <PauseBanner reason={tournament.pause_reason} />
      )}

      {/* Leaderboard */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardClient
            tournamentId={params.id}
            tournamentName={tournament.name}
            format={tournament.format}
            scoringType={tournament.scoring_type}
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
