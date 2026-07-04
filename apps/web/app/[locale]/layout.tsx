import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Navbar } from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OpenTour — Gratis golf toernooi & live scoring platform',
    template: '%s — OpenTour',
  },
  description: 'Organiseer golf toernooien met live leaderboards, offline scoring en deelnemersbeheer. Gratis en open source. Geen account nodig voor scores bekijken.',
  manifest: '/manifest.json',
  themeColor: '#15803d',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  metadataBase: new URL('https://open-tour-web.vercel.app'),
  alternates: {
    languages: {
      nl: '/nl',
      en: '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    siteName: 'OpenTour',
    title: 'OpenTour — Gratis golf toernooi & live scoring platform',
    description: 'Organiseer golf toernooien met live leaderboards, offline scoring en deelnemersbeheer. Gratis en open source.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTour — Gratis golf toernooi & live scoring platform',
    description: 'Organiseer golf toernooien met live leaderboards, offline scoring en deelnemersbeheer. Gratis en open source.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="alternate" hrefLang="nl" href="https://open-tour-web.vercel.app/nl" />
        <link rel="alternate" hrefLang="en" href="https://open-tour-web.vercel.app/en" />
        <link rel="alternate" hrefLang="x-default" href="https://open-tour-web.vercel.app/nl" />
      </head>
      <body className="bg-surface text-content antialiased min-h-screen" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem themes={['light', 'dark', 'system']}>
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
