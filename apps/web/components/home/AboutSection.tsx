interface Props {
  locale: string;
}

export function AboutSection({ locale }: Props) {
  const isNl = locale === 'nl';

  return (
    <section id="about" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl font-bold text-content mb-4">
            {isNl ? 'Wat is OpenTour?' : 'What is OpenTour?'}
          </h2>
          <p className="text-lg text-content-muted leading-relaxed">
            {isNl
              ? 'OpenTour is het gratis, open source platform waarmee golfclubs, vriendengroepen en verenigingen eenvoudig toernooien organiseren met live leaderboards — zonder dure abonnementen, zonder lock-in.'
              : 'OpenTour is the free, open source platform for golf clubs, friend groups, and associations to easily organize tournaments with live leaderboards — no subscriptions, no lock-in.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ),
              title: isNl ? 'Voor spelers' : 'For players',
              desc: isNl
                ? 'Volg live leaderboards zonder account. Bekijk uitslagen, stats en de stand van je competitie — op je telefoon, tablet of TV in het clubhuis.'
                : 'Follow live leaderboards without an account. View results, stats, and standings — on your phone, tablet, or clubhouse TV.',
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              ),
              title: isNl ? 'Voor verenigingen' : 'For clubs',
              desc: isNl
                ? 'Organiseer toernooien in minuten. Beheer deelnemers, genereer flights, en publiceer live scores — zonder dure software of IT-kennis.'
                : 'Organize tournaments in minutes. Manage players, generate flights, and publish live scores — no expensive software or IT skills needed.',
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              ),
              title: isNl ? 'Open source' : 'Open source',
              desc: isNl
                ? 'Volledige controle over je data. Zelf hosten, aanpassen, of bijdragen aan de community. AGPL-3.0 — altijd gratis, altijd van jou.'
                : 'Full control over your data. Self-host, customize, or contribute to the community. AGPL-3.0 — always free, always yours.',
            },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-900/30 border border-green-800/40 text-green-400 mb-4">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-content mb-2">{item.title}</h3>
              <p className="text-content-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
