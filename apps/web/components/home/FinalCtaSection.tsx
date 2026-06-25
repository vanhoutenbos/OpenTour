import Link from 'next/link';

interface Props {
  locale: string;
}

export function FinalCtaSection({ locale }: Props) {
  const isNl = locale === 'nl';

  return (
    <section id="cta" className="py-20">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {isNl ? 'Klaar om te beginnen?' : 'Ready to get started?'}
        </h2>
        <p className="text-lg text-gray-400 mb-8">
          {isNl
            ? 'Geen creditcard, geen abonnement, geen lock-in. Maak in 5 minuten je eerste toernooi aan.'
            : 'No credit card, no subscription, no lock-in. Create your first tournament in 5 minutes.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-green-900/50 text-lg"
          >
            {isNl ? 'Start nu — gratis' : 'Start now — free'} →
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            {isNl ? 'Al een account? Ga naar dashboard →' : 'Already have an account? Go to dashboard →'}
          </Link>
        </div>
      </div>
    </section>
  );
}
