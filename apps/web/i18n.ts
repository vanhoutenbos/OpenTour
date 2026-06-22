import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../../packages/i18n/${locale}/common.json`)).default,
}));
