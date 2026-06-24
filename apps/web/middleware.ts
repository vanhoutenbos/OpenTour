import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
});

// Paden waar we geen sessie hoeven te verversen
const PUBLIC_PATHS = [
  '/auth/callback',
  '/login',
  '/tournament', // publiek leaderboard
];

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname } = request.nextUrl;

  // Alleen sessie verversen op beschermde paden
  const needsAuth = pathname.includes('/dashboard') || pathname.includes('/manage');

  if (needsAuth) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  // Sluit statische bestanden, _next internals en API routes uit
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
