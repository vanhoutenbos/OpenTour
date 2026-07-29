'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Props {
  locale: string;
}

export function FinalCtaSection({ locale }: Props) {
  const t = useTranslations('home');

  return (
    <section id="cta" className="py-20 bg-surface">
      <div className="max-w-admin mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-heading font-serif text-content mb-4">
            {t('finalCtaTitle')}
          </h2>
          <p className="text-body text-content-muted mb-10 max-w-xl mx-auto">
            {t('finalCtaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-button bg-brand-primary hover:bg-brand-primary-hover text-content-inverse font-semibold transition-colors text-base"
            >
              {t('finalCtaPrimary')} →
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-button bg-surface-3 hover:bg-surface-4 text-content font-semibold transition-colors text-base"
            >
              {t('finalCtaSecondary')} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
