import Link from 'next/link';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  const isNl = locale === 'nl';

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-content mb-8">
          {isNl ? 'Privacyverklaring' : 'Privacy Policy'}
        </h1>

        <section className="space-y-6 text-content-secondary leading-relaxed">
          <p>
            {isNl
              ? 'OpenTour (aangeboden door Van Houten Solutions) neemt je privacy serieus. Deze verklaring beschrijft welke gegevens we verzamelen, waarom, en hoe we ze beschermen.'
              : 'OpenTour (operated by Van Houten Solutions) takes your privacy seriously. This policy describes what data we collect, why, and how we protect it.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Welke gegevens we verzamelen' : 'What data we collect'}
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              {isNl ? 'Naam — nodig voor scorekaarten en het leaderboard.' : 'Name — needed for scorecards and the leaderboard.'}
            </li>
            <li>
              {isNl ? 'Handicap — optioneel, voor netto-scoring.' : 'Handicap — optional, for net scoring.'}
            </li>
            <li>
              {isNl ? 'Geslacht — optioneel, voor wedstrijdadministratie.' : 'Gender — optional, for tournament administration.'}
            </li>
          </ul>

          <p>
            {isNl
              ? 'We verzamelen geen locatiegegevens, browsergeschiedenis, betalingsgegevens of tracking-cookies.'
              : 'We do not collect location data, browsing history, payment details, or tracking cookies.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Waarom we deze gegevens verwerken' : 'Why we process this data'}
          </h2>
          <p>
            {isNl
              ? 'Je naam en scores worden verwerkt om het leaderboard en de scorekaart mogelijk te maken. Dit is noodzakelijk voor de uitvoering van het toernooi.'
              : 'Your name and scores are processed to enable the leaderboard and scorecard. This is necessary for the tournament to function.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Publieke en niet-publieke data' : 'Public and non-public data'}
          </h2>
          <p>
            {isNl
              ? 'Het leaderboard is publiek zichtbaar zonder account. Naam en scores van spelers zijn zichtbaar op het leaderboard. E-mailadressen en overige persoonsgegevens worden nooit publiek getoond.'
              : 'The leaderboard is publicly visible without an account. Player names and scores are visible on the leaderboard. Email addresses and other personal data are never publicly displayed.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Delen met derden' : 'Sharing with third parties'}
          </h2>
          <p>
            {isNl
              ? 'We delen geen persoonsgegevens met commerciële derden. We gebruiken Supabase (database) en Vercel (hosting) als technische dienstverleners.'
              : 'We do not share personal data with commercial third parties. We use Supabase (database) and Vercel (hosting) as technical service providers.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Bewaartermijn' : 'Retention period'}
          </h2>
          <p>
            {isNl
              ? 'Toernooiuitslagen en scores worden permanent bewaard als archief. Persoonsgegevens worden bewaard zolang het toernooi actief is.'
              : 'Tournament results and scores are permanently retained as an archive. Personal data is retained as long as the tournament is active.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Je rechten' : 'Your rights'}
          </h2>
          <p>
            {isNl
              ? 'Je hebt recht op inzage, correctie en verwijdering van je persoonsgegevens. Neem contact op voor een verzoek.'
              : 'You have the right to access, correct, and delete your personal data. Contact us to make a request.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Cookies' : 'Cookies'}
          </h2>
          <p>
            {isNl
              ? 'OpenTour gebruikt alleen functionele cookies die nodig zijn voor de werking van de site (zoals je sessie). Er worden geen analytische cookies of tracking-cookies geplaatst.'
              : 'OpenTour uses only functional cookies necessary for the site to work (such as your session). No analytics or tracking cookies are placed.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Beveiliging' : 'Security'}
          </h2>
          <p>
            {isNl
              ? 'We nemen passende technische en organisatorische maatregelen om je gegevens te beschermen tegen ongeautoriseerde toegang of misbruik.'
              : 'We take appropriate technical and organizational measures to protect your data against unauthorized access or misuse.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Wijzigingen' : 'Changes'}
          </h2>
          <p>
            {isNl
              ? 'We kunnen deze privacyverklaring van tijd tot tijd bijwerken. Wijzigingen worden op deze pagina gepubliceerd.'
              : 'We may update this privacy policy from time to time. Changes will be published on this page.'}
          </p>

          <h2 className="text-xl font-semibold text-content mt-8">
            {isNl ? 'Contact' : 'Contact'}
          </h2>
          <p>
            {isNl
              ? 'Voor vragen over deze privacyverklaring: opentour@vanhoutensolutions.nl'
              : 'For questions about this privacy policy: opentour@vanhoutensolutions.nl'}
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