interface Props {
  locale: string;
}

const featuresNl = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Toernooimaker',
    desc: 'Maak in 5 minuten een toernooi aan — kies baan, format (stroke/stableford/matchplay), flights en categorieën.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
    title: 'Live scoring & leaderboards',
    desc: 'Scores invoeren via mobiel, leaderboard automatisch bijgewerkt. Werkt in elke browser — geen app nodig voor kijkers.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.475-3.475 9.337 9.337 0 00-1.378-.368m0 0a9.38 9.38 0 00-6.236 0m6.236 0a9.337 9.337 0 00-4.121-.952m10.357 0a9.337 9.337 0 011.378.368M12 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'Deelnemersbeheer',
    desc: 'Spelers toevoegen of importeren via CSV. Flights automatisch genereren, starttijden instellen, categorieën per handicap.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    title: 'Export & print',
    desc: 'Scorecards exporteren naar CSV of JSON, of direct printen. Je data is van jou — altijd exporteerbaar.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Offline-first',
    desc: 'Geen bereik op de baan? Geen probleem. Scores worden offline opgeslagen en automatisch gesynchroniseerd.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: 'Open source & self-hosting',
    desc: 'AGPL-3.0. Zelf hosten, aanpassen of bijdragen via GitHub. Geen vendor lock-in — jouw data blijft van jou.',
  },
];

const featuresEn = [
  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Tournament Maker', desc: 'Create a tournament in 5 minutes — choose course, format, flights, and categories.' },
  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>, title: 'Live scoring & leaderboards', desc: 'Enter scores from your phone, leaderboard updates automatically. Works in any browser.' },
  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.475-3.475 9.337 9.337 0 00-1.378-.368m0 0a9.38 9.38 0 00-6.236 0m6.236 0a9.337 9.337 0 00-4.121-.952m10.357 0a9.337 9.337 0 011.378.368M12 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, title: 'Player management', desc: 'Add players manually or import via CSV. Auto-generate flights, set tee times, organize categories.' },
  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>, title: 'Export & print', desc: 'Export scorecards to CSV or JSON. Your data is yours — always exportable, always migratable.' },
  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>, title: 'Offline-first', desc: 'No signal on the course? No problem. Scores are saved offline and sync automatically when you reconnect.' },
  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>, title: 'Open source & self-hosting', desc: 'AGPL-3.0. Self-host, customize, or contribute on GitHub. No vendor lock-in.' },
];

export function FeaturesSection({ locale }: Props) {
  const features = locale === 'nl' ? featuresNl : featuresEn;

  return (
    <section id="features" className="py-20 bg-surface">
      <div className="max-w-admin mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="text-label text-content-muted mb-3 tracking-section">
            {locale === 'nl' ? 'KENMERKEN' : 'FEATURES'}
          </p>
          <h2 className="text-heading font-serif text-content mb-4">
            {locale === 'nl' ? 'Alles wat je nodig heeft' : 'Everything you need'}
          </h2>
          <p className="text-body text-content-muted max-w-2xl mx-auto">
            {locale === 'nl'
              ? 'Van aanmaken tot uitslag — OpenTour begeleidt je bij elke stap.'
              : 'From creation to results — OpenTour guides you through every step.'}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-surface-2 border border-border rounded-card p-6 hover:border-border-strong transition-colors group"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-button bg-brand-primary/10 text-brand-primary mb-4 group-hover:bg-brand-primary/15 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-content mb-2">{feature.title}</h3>
              <p className="text-body text-content-muted leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
