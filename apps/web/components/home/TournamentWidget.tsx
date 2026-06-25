import { TournamentCard } from './TournamentCard';

interface TournamentRow {
  id: string;
  name: string;
  format: string;
  scoring_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  course_name: string | null;
  course_location: string | null;
  player_count: number;
}

interface Props {
  locale: string;
}

async function fetchTournaments(
  urlBase: string,
  anonKey: string,
  statusFilter: string,
  order: string
): Promise<TournamentRow[]> {
  const filter =
    statusFilter === 'active'
      ? `status=eq.${statusFilter}&is_public=eq.true`
      : `is_public=eq.true&or=(status.eq.draft,and(status.eq.active,start_date.gt.now))`;

  const url = `${urlBase}/rest/v1/tournaments?select=id,name,format,scoring_type,status,start_date,end_date,course:course_id(name,location)&${filter}&order=${order}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) return [];

    const data = await res.json();

    const enriched = await Promise.all(
      data.map(async (t: Record<string, unknown>) => {
        const course = t.course as { name?: string; location?: string } | null;
        const countUrl = `${urlBase}/rest/v1/tournament_players?tournament_id=eq.${t.id}&select=id`;
        let count = 0;
        try {
          const countRes = await fetch(countUrl, {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
            next: { revalidate: 30 },
          });
          if (countRes.ok) {
            const countData = await countRes.json();
            count = Array.isArray(countData) ? countData.length : 0;
          }
        } catch {}

        return {
          id: t.id as string,
          name: t.name as string,
          format: t.format as string,
          scoring_type: t.scoring_type as string,
          status: t.status as string,
          start_date: (t.start_date as string) ?? null,
          end_date: (t.end_date as string) ?? null,
          course_name: course?.name ?? null,
          course_location: course?.location ?? null,
          player_count: count,
        };
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

export async function TournamentWidget({ locale }: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const [activeTournaments, upcomingTournaments] = await Promise.all([
    fetchTournaments(supabaseUrl, anonKey, 'active', 'start_date.asc'),
    fetchTournaments(supabaseUrl, anonKey, 'upcoming', 'start_date.asc'),
  ]);

  const hasAny = activeTournaments.length > 0 || upcomingTournaments.length > 0;

  return (
    <section id="tournaments" className="py-20 bg-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {locale === 'nl' ? 'Wedstrijden' : 'Tournaments'}
            </h2>
            <p className="text-gray-400 mt-1">
              {locale === 'nl'
                ? 'Volg live scores of ontdek aankomende wedstrijden'
                : 'Follow live scores or discover upcoming tournaments'}
            </p>
          </div>
        </div>

        {!hasAny ? (
          <div className="text-center py-16 bg-gray-950/50 rounded-2xl border border-gray-800">
            <div className="text-5xl mb-4">🏌️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {locale === 'nl' ? 'Nog geen wedstrijden gepland' : 'No tournaments scheduled yet'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {locale === 'nl'
                ? 'Wees de eerste! Maak een toernooi aan en nodig je club of vrienden uit.'
                : 'Be the first! Create a tournament and invite your club or friends.'}
            </p>
            <a
              href={`/${locale}/login`}
              className="inline-flex items-center px-6 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
            >
              {locale === 'nl' ? 'Maak je eerste toernooi →' : 'Create your first tournament →'}
            </a>
          </div>
        ) : (
          <div className="space-y-12">
            {activeTournaments.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <h3 className="text-lg font-semibold text-green-400 uppercase tracking-wider">
                    {locale === 'nl' ? 'Live' : 'Live'}
                  </h3>
                  <span className="text-sm text-gray-500">({activeTournaments.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTournaments.map((t) => (
                    <TournamentCard key={t.id} tournament={t} locale={locale} />
                  ))}
                </div>
              </div>
            )}

            {upcomingTournaments.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                  <h3 className="text-lg font-semibold text-blue-400 uppercase tracking-wider">
                    {locale === 'nl' ? 'Aankomend' : 'Upcoming'}
                  </h3>
                  <span className="text-sm text-gray-500">({upcomingTournaments.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingTournaments.map((t) => (
                    <TournamentCard key={t.id} tournament={t} locale={locale} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
