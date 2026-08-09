import { getRequestConfig } from 'next-intl/server';

const locales = ['nl', 'en'] as const;

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locale && locales.includes(locale as (typeof locales)[number]) ? locale : 'nl';

  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default,
  };
});
