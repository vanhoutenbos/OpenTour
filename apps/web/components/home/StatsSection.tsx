interface Props {
  locale: string;
}

async function fetchStats(supabaseUrl: string, anonKey: string) {
  const defaultStats = { tournaments: 0, scores: 0, players: 0, githubStars: 0 };

  try {
    const [tournamentsRes, scoresRes, playersRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/tournaments?select=id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        next: { revalidate: 60 },
      }),
      fetch(`${supabaseUrl}/rest/v1/scores?select=id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        next: { revalidate: 60 },
      }),
      fetch(`${supabaseUrl}/rest/v1/tournament_players?select=id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        next: { revalidate: 60 },
      }),
    ]);

    const tournaments = tournamentsRes.ok ? await tournamentsRes.json() : [];
    const scores = scoresRes.ok ? await scoresRes.json() : [];
    const players = playersRes.ok ? await playersRes.json() : [];

    let githubStars = 0;
    try {
      const ghRes = await fetch('https://api.github.com/repos/vanhoutenbos/opentour', {
        next: { revalidate: 3600 },
      });
      if (ghRes.ok) {
        const gh = await ghRes.json();
        githubStars = gh.stargazers_count ?? 0;
      }
    } catch {}

    return {
      tournaments: Array.isArray(tournaments) ? tournaments.length : 0,
      scores: Array.isArray(scores) ? scores.length : 0,
      players: Array.isArray(players) ? players.length : 0,
      githubStars,
    };
  } catch {
    return defaultStats;
  }
}

export async function StatsSection({ locale }: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const stats = await fetchStats(supabaseUrl, anonKey);

  const items = [
    {
      value: stats.tournaments.toLocaleString(locale),
      label: locale === 'nl' ? 'toernooien' : 'tournaments',
      icon: '🏆',
    },
    {
      value: stats.scores.toLocaleString(locale),
      label: locale === 'nl' ? 'scores ingevoerd' : 'scores entered',
      icon: '⛳',
    },
    {
      value: stats.players.toLocaleString(locale),
      label: locale === 'nl' ? 'unieke spelers' : 'unique players',
      icon: '👥',
    },
    {
      value: stats.githubStars > 0 ? `☆ ${stats.githubStars}` : '—',
      label: locale === 'nl' ? 'op GitHub' : 'on GitHub',
      icon: '⭐',
    },
  ];

  const hasData = stats.tournaments > 0 || stats.scores > 0 || stats.players > 0;

  if (!hasData) return null;

  return (
    <section id="stats" className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-3xl font-bold text-content">{item.value}</div>
              <div className="text-sm text-content-muted mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
