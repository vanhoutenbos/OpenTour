'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Props {
  locale: string;
  isLoggedIn: boolean;
}

export function HeroSection({ locale, isLoggedIn }: Props) {
  const t = useTranslations('home');

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Misty golf background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-golf-mist.jpg')" }}
      />
      {/* Warm overlay — matches admin palette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-admin mx-auto px-6 w-full py-20">
        <div className="max-w-2xl">
          {/* Uppercase label */}
          <p className="text-label text-content-inverse/80 mb-4 tracking-section">
            {t('heroLabel')}
          </p>

          {/* Serif headline */}
          <h1 className="text-display font-serif text-content-inverse mb-6 text-balance">
            {t('heroTitle')}
          </h1>

          {/* Body copy */}
          <p className="text-body text-content-inverse/75 mb-10 max-w-xl leading-relaxed">
            {t('heroSubtitle')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-button bg-brand-primary hover:bg-brand-primary-hover text-content-inverse font-semibold transition-colors text-base"
            >
              {t('heroCtaPrimary')} →
            </Link>
            {isLoggedIn ? (
              <Link
                href={`/${locale}/dashboard`}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-button bg-content-inverse/10 hover:bg-content-inverse/20 text-content-inverse font-semibold transition-colors text-base backdrop-blur-sm"
              >
                {t('heroCtaDashboard')} →
              </Link>
            ) : (
              <Link
                href={`/${locale}/scorer`}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-button bg-content-inverse/10 hover:bg-content-inverse/20 text-content-inverse font-semibold transition-colors text-base backdrop-blur-sm"
              >
                {t('heroCtaSecondary')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface to-transparent" />
    </section>
  );
}
