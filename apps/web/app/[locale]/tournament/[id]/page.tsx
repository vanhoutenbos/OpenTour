import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { SponsorBanner } from '@/components/leaderboard/SponsorBanner';

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
  course_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CourseRow {
  id: string;
  name: string;
  location: string | null;
}

interface FlightRow {
  id: string;
  name: string;
  start_time: string | null;
  tee_number: number;
  category_id: string | null;
  max_players: number;
}

interface CategoryRow {
  id: string;
  name: string;
}

interface PlayerRow {
  id: string;
  name: string;
  handicap: number | null;
  flight_id: string | null;
  started_on_hole?: number;
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

async function getCourseName(courseId: string | null): Promise<string | null> {
  if (!courseId) return null;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/courses?id=eq.${courseId}&select=name&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const rows: CourseRow[] = await res.json();
  return rows[0]?.name ?? null;
}

async function getFlightsWithPlayers(tournamentId: string) {
  const flightsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/flights?tournament_id=eq.${tournamentId}&order=start_time.asc`;
  const playersUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tournament_players?tournament_id=eq.${tournamentId}&select=id,name,handicap,flight_id,status&status=neq.withdrawn`;
  const categoriesUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tournament_categories?tournament_id=eq.${tournamentId}&select=id,name`;

  const [flightsRes, playersRes, categoriesRes] = await Promise.all([
    fetch(flightsUrl, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      next: { revalidate: 30 },
    }),
    fetch(playersUrl, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      next: { revalidate: 30 },
    }),
    fetch(categoriesUrl, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      next: { revalidate: 60 },
    }),
  ]);

  if (!flightsRes.ok || !playersRes.ok) return [];

  const flights: FlightRow[] = await flightsRes.json();
  const players: PlayerRow[] = await playersRes.json();
  const categories: CategoryRow[] = categoriesRes.ok ? await categoriesRes.json() : [];

  return flights.map((f) => {
    const catName = categories.find((c) => c.id === f.category_id)?.name;
    return {
      id: f.id,
      name: f.name,
      start_time: f.start_time,
      tee_number: f.tee_number,
      category_name: catName,
      players: players
        .filter((p) => p.flight_id === f.id && p.status !== 'withdrawn')
        .map((p) => ({
          id: p.id,
          name: p.name,
          handicap: p.handicap,
          started_on_hole: f.tee_number,
        })),
    };
  });
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

  const [courseName, flights] = await Promise.all([
    getCourseName(tournament.course_id),
    getFlightsWithPlayers(params.id),
  ]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Sponsor top banner */}
      <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto px-4 pt-4">
        <SponsorBanner position="top" />
      </div>

      {/* Pause banner */}
      {tournament.status === 'paused' && tournament.pause_reason && (
        <div className="bg-yellow-900/40 border-b border-yellow-700 px-4 py-3">
          <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto flex items-center gap-3">
            <span className="text-2xl">⏸️</span>
            <div>
              <p className="font-semibold text-yellow-300">Toernooi gepauzeerd</p>
              <p className="text-sm text-yellow-200">{tournament.pause_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main leaderboard */}
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardClient
          tournamentId={params.id}
          tournamentName={tournament.name}
          tournamentDescription={tournament.description}
          format={tournament.format}
          scoringType={tournament.scoring_type}
          isActive={tournament.status === 'active'}
          status={tournament.status}
          startDate={tournament.start_date}
          endDate={tournament.end_date}
          courseName={courseName}
          rounds={tournament.rounds}
          flights={flights}
          playerCount={undefined}
          flightCount={flights.length}
        />
      </Suspense>
    </main>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="max-w-[var(--leaderboard-max-width,1280px)] mx-auto px-4 py-4">
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-gray-800 rounded-xl" />
        <div className="h-12 bg-gray-800 rounded-lg" />
        <div className="h-14 bg-gray-800 rounded-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
