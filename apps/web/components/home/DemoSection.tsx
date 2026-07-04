interface Props {
  locale: string;
}

export function DemoSection({ locale }: Props) {
  const isNl = locale === 'nl';

  return (
    <section id="demo" className="py-20 bg-surface-2">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-content mb-4">
            {isNl ? 'Zie het in actie' : 'See it in action'}
          </h2>
          <p className="text-content-muted max-w-2xl mx-auto">
            {isNl
              ? 'Bekijk hoe eenvoudig het is om een toernooi op te zetten, scores in te voeren en het leaderboard te volgen.'
              : 'See how easy it is to set up a tournament, enter scores, and follow the leaderboard.'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative aspect-video bg-surface rounded-2xl border border-border overflow-hidden flex items-center justify-center group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-green-950" />
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-700/80 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <svg className="w-7 h-7 text-content ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              </div>
              <p className="text-content-muted text-sm">
                {isNl ? 'Demo video (binnenkort beschikbaar)' : 'Demo video (coming soon)'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {[
              { label: isNl ? 'Leaderboard' : 'Leaderboard', desc: isNl ? 'Live scores op elk scherm' : 'Live scores on any screen' },
              { label: isNl ? 'Scorer' : 'Scorer', desc: isNl ? 'Offline invoer op de baan' : 'Offline entry on the course' },
              { label: isNl ? 'Beheer' : 'Management', desc: isNl ? 'Flights, spelers & instellingen' : 'Flights, players & settings' },
            ].map((item, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-content mb-1">{item.label}</div>
                <div className="text-xs text-content-muted">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
