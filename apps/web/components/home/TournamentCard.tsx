import Link from 'next/link';

interface TournamentCardData {
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
  tournament: TournamentCardData;
  locale: string;
}

export function TournamentCard({ tournament, locale }: Props) {
  const isLive = tournament.status === 'active';
  const dateLocale = locale === 'nl' ? 'nl-NL' : 'en-GB';

  const formatLabel: Record<string, string> = {
    stroke: 'Stroke play',
    stableford: 'Stableford',
    match: 'Matchplay',
  };

  return (
    <Link
      href={`/${locale}/tournament/${tournament.id}`}
      className="group block bg-surface-2 border border-border rounded-xl p-5 hover:border-green-700/50 hover:bg-surface-4 transition-all hover:shadow-lg hover:shadow-green-900/10"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-content group-hover:text-green-400 transition-colors leading-tight">
          {tournament.name}
        </h3>
        {isLive && (
          <div className="flex items-center gap-1.5 bg-green-900/40 border border-green-700 px-2.5 py-1 rounded-full shrink-0 ml-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-[10px] font-bold text-green-400 tracking-wider">LIVE</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-content-muted">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>{tournament.course_name ?? 'Onbekende baan'}{tournament.course_location ? `, ${tournament.course_location}` : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-content-muted">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span>{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Datum onbekend'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-content-muted">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>{tournament.player_count} {locale === 'nl' ? 'deelnemers' : 'players'}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs bg-surface-3 text-content-secondary px-2 py-0.5 rounded-md">{formatLabel[tournament.format] ?? tournament.format}</span>
          <span className="text-xs bg-surface-3 text-content-secondary px-2 py-0.5 rounded-md uppercase">{tournament.scoring_type}</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <span className="text-sm font-medium text-green-500 group-hover:text-green-400 transition-colors">
          {locale === 'nl' ? 'Bekijk leaderboard →' : 'View leaderboard →'}
        </span>
      </div>
    </Link>
  );
}
