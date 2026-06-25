import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'OpenTour — Golf toernooi platform',
  description: 'Gratis golf toernooi en live scoring platform voor clubs, vrienden en laddercompetities.',
  manifest: '/manifest.json',
  themeColor: '#15803d',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className="bg-gray-950 text-white antialiased min-h-screen">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
