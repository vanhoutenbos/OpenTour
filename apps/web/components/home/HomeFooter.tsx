import Link from 'next/link';

interface Props {
  locale: string;
}

export function HomeFooter({ locale }: Props) {
  const isNl = locale === 'nl';

  return (
    <footer className="py-12 bg-surface border-t border-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="font-semibold text-content mb-3">OpenTour</h4>
            <ul className="space-y-2 text-sm text-content-muted">
              <li>
                <Link href={`/${locale}/login`} className="hover:text-green-400 transition-colors">
                  {isNl ? 'Toernooi aanmaken' : 'Create tournament'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/scorer`} className="hover:text-green-400 transition-colors">
                  {isNl ? 'Score invoeren' : 'Enter scores'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/dashboard`} className="hover:text-green-400 transition-colors">
                  {isNl ? 'Dashboard' : 'Dashboard'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-content mb-3">{isNl ? 'Community' : 'Community'}</h4>
            <ul className="space-y-2 text-sm text-content-muted">
              <li>
                <a href="https://github.com/vanhoutenbos/opentour" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/vanhoutenbos/opentour/issues" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                  {isNl ? 'Issues melden' : 'Report issues'}
                </a>
              </li>
              <li>
                <a href="https://github.com/vanhoutenbos/opentour/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                  {isNl ? 'Bijdragen' : 'Contributing'}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-content mb-3">{isNl ? 'Ontwikkelaars' : 'Developers'}</h4>
            <ul className="space-y-2 text-sm text-content-muted">
              <li>
                <a href="https://github.com/vanhoutenbos/opentour#readme" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                  {isNl ? 'Documentatie' : 'Documentation'}
                </a>
              </li>
              <li>
                <a href="https://github.com/vanhoutenbos/opentour/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                  AGPL-3.0 {isNl ? 'Licentie' : 'License'}
                </a>
              </li>
              <li>
                <Link href={`/${locale}/login`} className="hover:text-green-400 transition-colors">
                  {isNl ? 'API (later)' : 'API (coming soon)'}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-content mb-3">{isNl ? 'Legal' : 'Legal'}</h4>
            <ul className="space-y-2 text-sm text-content-muted">
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-green-400 transition-colors">
                  {isNl ? 'Privacyverklaring' : 'Privacy policy'}
                </Link>
              </li>
              <li>
                <span className="text-content-muted">
                  {isNl ? 'Geen tracking cookies' : 'No tracking cookies'}
                </span>
              </li>
              <li>
                <a href="https://github.com/vanhoutenbos/opentour/blob/main/security.md" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                  {isNl ? 'Security' : 'Security'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-content-muted">
            OpenTour — {isNl ? 'Open source golf toernooi platform' : 'Open source golf tournament platform'}
          </p>
          <div className="flex items-center gap-4 text-sm text-content-muted">
            <span>{isNl ? 'Gehost op Vercel' : 'Hosted on Vercel'}</span>
            <span>·</span>
            <span>AGPL-3.0</span>
            <span>·</span>
            <a
              href="https://github.com/vanhoutenbos/opentour"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-green-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
