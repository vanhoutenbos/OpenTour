'use client';

import Link from 'next/link';

interface CookiePolicyPageProps {
  locale: string;
}

export default function CookiePolicyPage({ locale }: CookiePolicyPageProps) {
  const isNl = locale === 'nl';

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-content mb-8">
          {isNl ? 'Cookieverklaring' : 'Cookie Policy'}
        </h1>

        <section className="space-y-6 text-content-secondary leading-relaxed">
          <p>
            {isNl
              ? 'OpenTour gebruikt cookies uitsluitend om de website naar behoren te laten werken.'
              : 'OpenTour uses cookies exclusively to make the website function properly.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Welke cookies gebruiken we?' : 'What cookies do we use?'}
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              {isNl
                ? 'Functionele cookies — essentieel voor de werking van de site, zoals je authenticatiesessie.'
                : 'Functional cookies — essential for the site to work, such as your authentication session.'}
            </li>
          </ul>

          <p>
            {isNl
              ? 'We plaatsen geen analytische cookies, tracking-cookies of advertentiecookies.'
              : 'We do not place analytics cookies, tracking cookies, or advertising cookies.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Hoe kun je cookies beheren?' : 'How can you manage cookies?'}
          </h2>
          <p>
            {isNl
              ? 'Je kunt cookies beheren via je browserinstellingen. Het uitschakelen van functionele cookies kan de werking van de site beïnvloeden.'
              : 'You can manage cookies via your browser settings. Disabling functional cookies may affect the functioning of the site.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Wijzigingen' : 'Changes'}
          </h2>
          <p>
            {isNl
              ? 'We kunnen deze cookieverklaring van tijd tot tijd bijwerken. Wijzigingen worden op deze pagina gepubliceerd.'
              : 'We may update this cookie policy from time to time. Changes will be published on this page.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Contact' : 'Contact'}
          </h2>
          <p>
            {isNl
              ? 'Voor vragen over ons cookiebeleid: opentour@vanhoutensolutions.nl'
              : 'For questions about our cookie policy: opentour@vanhoutensolutions.nl'}
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-border">
          <Link href={`/${locale}`} className="text-green-400 hover:text-green-300 text-sm transition-colors">
            &larr; {isNl ? 'Terug naar de site' : 'Back to site'}
          </Link>
        </div>
      </div>
    </main>
  );
}