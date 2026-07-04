interface Props {
  locale: string;
}

const featuresNl = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
    ),
    title: 'Toernooimaker',
    desc: 'Maak in 5 minuten een toernooi aan — kies baan, format (stroke/stableford/matchplay), flights en categorieën. Geen gedoe met Excel.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    ),
    title: 'Live scoring & leaderboards',
    desc: 'Scores invoeren via mobiel, leaderboard automatisch bijgewerkt elke 30 seconden. Geen app nodig voor kijkers — werkt in elke browser.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    ),
    title: 'Deelnemersbeheer',
    desc: 'Spelers toevoegen via handmatige invoer of CSV-import. Flights automatisch genereren, starttijden instellen, categorieën per handicap en geslacht.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ),
    title: 'Export & print',
    desc: 'Scorecards exporteren naar CSV of JSON, of direct printen. Data is van jou — altijd exporteerbaar, altijd migreerbaar.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ),
    title: 'Offline-first',
    desc: 'Geen bereik op de baan? Geen probleem. Scores worden offline opgeslagen (IndexedDB) en automatisch gesynchroniseerd zodra je weer online bent.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
    ),
    title: 'Open source & self-hosting',
    desc: 'AGPL-3.0. Zelf hosten, aanpassen of bijdragen via GitHub. Geen vendor lock-in — jouw data blijft van jou.',
  },
];

const featuresEn = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
    ),
    title: 'Tournament Maker',
    desc: 'Create a tournament in 5 minutes — choose course, format (stroke/stableford/matchplay), flights, and categories. No more spreadsheets.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    ),
    title: 'Live scoring & leaderboards',
    desc: 'Enter scores from your phone, leaderboard updates every 30 seconds. No app required for spectators — works in any browser.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    ),
    title: 'Player management',
    desc: 'Add players manually or import via CSV. Auto-generate flights, set tee times, organize categories by handicap and gender.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ),
    title: 'Export & print',
    desc: 'Export scorecards to CSV or JSON, or print directly. Your data is yours — always exportable, always migratable.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ),
    title: 'Offline-first',
    desc: 'No signal on the course? No problem. Scores are saved offline (IndexedDB) and sync automatically when you reconnect.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
    ),
    title: 'Open source & self-hosting',
    desc: 'AGPL-3.0. Self-host, customize, or contribute on GitHub. No vendor lock-in — your data stays yours.',
  },
];

export function FeaturesSection({ locale }: Props) {
  const features = locale === 'nl' ? featuresNl : featuresEn;

  return (
    <section id="features" className="py-20 bg-surface-2/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-content mb-4">
            {locale === 'nl' ? 'Alles wat je nodig hebt' : 'Everything you need'}
          </h2>
          <p className="text-content-muted max-w-2xl mx-auto">
            {locale === 'nl'
              ? 'Van aanmaken tot uitslag — OpenTour begeleidt je bij elke stap.'
              : 'From creation to results — OpenTour guides you through every step.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-surface-2 border border-border rounded-xl p-6 hover:border-green-800/40 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-900/30 border border-green-800/40 text-green-400 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-content mb-2">{feature.title}</h3>
              <p className="text-content-muted text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
