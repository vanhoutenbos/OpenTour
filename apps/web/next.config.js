const path = require('path');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const createNextIntlPlugin = require('next-intl/plugin');
// Absoluut pad zodat het werkt ongeacht working directory
const withNextIntl = createNextIntlPlugin(path.resolve(__dirname, 'i18n.ts'));

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://ygewcjsrpewwhiqgcmyn.supabase.co",
      "img-src 'self' data: blob: https: https://open-tour-web.vercel.app",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
  transpilePackages: ['@opentour/types', '@opentour/supabase', '@opentour/i18n'],
};

module.exports = withNextIntl(withPWA(nextConfig));
