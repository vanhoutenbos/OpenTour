import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth callback NOOIT door intl middleware sturen
  if (pathname === '/auth/callback') {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // Sessie verversen alleen op beschermde paden
  const needsAuth = pathname.includes('/dashboard') || pathname.includes('/manage');
  if (needsAuth) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
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
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', ],
};
