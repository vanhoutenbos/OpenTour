import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'dashboard.gettingStarted' });
  return {
    title: t('title'),
  };
}

const STEP_NUMBERS = ['course', 'tournament', 'accessCodes', 'activate'] as const;

export default async function GettingStartedPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'dashboard.gettingStarted' });

  const stepLinks: Record<(typeof STEP_NUMBERS)[number], string | null> = {
    course: `/${locale}/course/new`,
    tournament: `/${locale}/tournament/new`,
    accessCodes: null,
    activate: null,
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center text-sm text-content-muted hover:text-content transition-colors mb-6"
        >
          {t('backToDashboard')}
        </Link>

        <div className="mb-10">
          <h1 className="text-2xl font-bold text-content mb-2">{t('title')}</h1>
          <p className="text-content-muted">{t('subtitle')}</p>
        </div>

        <ol className="space-y-4">
          {STEP_NUMBERS.map((step, index) => {
            const cta = stepLinks[step];
            const hasCta = cta !== null;
            return (
              <li
                key={step}
                className="bg-surface-2 border border-border rounded-2xl p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="shrink-0 w-8 h-8 rounded-full bg-green-900/40 text-green-400
                               flex items-center justify-center text-sm font-bold border border-green-800/60"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-content mb-1.5">
                      {t(`steps.${step}.title`)}
                    </h2>
                    <p className="text-sm text-content-muted leading-relaxed">
                      {t(`steps.${step}.description`)}
                    </p>
                    <p className="text-xs text-content-muted italic mt-3">
                      {t(`steps.${step}.tip`)}
                    </p>
                    {hasCta && (
                      <Link
                        href={cta}
                        className="inline-flex items-center mt-4 px-4 py-2 bg-green-700 hover:bg-green-600
                                   text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {t(`steps.${step}.cta`)}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 border-t border-border pt-8 text-center">
          <h3 className="text-sm font-semibold text-content mb-1">{t('helpTitle')}</h3>
          <p className="text-sm text-content-muted mb-4">{t('helpDescription')}</p>
          <a
            href="https://github.com/vanhoutenbos/opentour"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                       text-content-secondary hover:text-content hover:bg-surface-3 border border-border transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            {t('helpCta')}
          </a>
        </div>
      </div>
    </main>
  );
}
