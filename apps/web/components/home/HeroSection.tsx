import Link from 'next/link';

interface Props {
  locale: string;
  isLoggedIn: boolean;
}

export function HeroSection({ locale, isLoggedIn }: Props) {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-green-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-800/50 px-3 py-1.5 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-400 tracking-wider uppercase">Gratis · Open source · Live scoring</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Organiseer golf toernooien<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
              zonder poespas.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-4 max-w-2xl leading-relaxed">
            OpenTour is het gratis, open source platform voor live scoring, deelnemersbeheer en leaderboards.
            Voor clubs en vriendengroepen — van Dutch Open tot zaterdagochtend competitie.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-8 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Geen account nodig voor scores bekijken
            </span>
            <span className="hidden sm:inline text-gray-700">·</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Offline scoring op de baan
            </span>
            <span className="hidden sm:inline text-gray-700">·</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Altijd exporteerbaar
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-green-900/50 text-lg"
            >
              Maak je eerste toernooi →
            </Link>
            {isLoggedIn ? (
              <Link
                href={`/${locale}/dashboard`}
                className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                📋 Mijn dashboard →
              </Link>
            ) : (
              <Link
                href={`/${locale}/scorer`}
                className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Score invoeren
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
