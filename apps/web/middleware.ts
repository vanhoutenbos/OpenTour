import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth callback nooit door intl middleware sturen
  if (pathname === '/auth/callback') {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // Alleen op beschermde routes de sessie refreshen
  // Dit is exact de aanpak die werkte in commit 400e085
  const needsAuth =
    pathname.includes('/dashboard') ||
    pathname.includes('/manage') ||
    pathname.includes('/tournament/new') ||
    pathname.includes('/course/new');

  if (needsAuth) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options?: CookieOptions) {
            // Schrijf vernieuwde cookies naar de response
            // zodat de browser client ze bij de volgende request heeft
            response.cookies.set(name, value, {
              ...options,
              path: '/',
              sameSite: 'lax',
            });
          },
          remove(name: string, options?: CookieOptions) {
            response.cookies.set(name, '', {
              ...options,
              path: '/',
              sameSite: 'lax',
              maxAge: 0,
            });
          },
        },
      }
    );

    // getUser() valideert de sessie server-side en refresht de access token
    // als die verlopen is. De vernieuwde token wordt via cookies.set
    // teruggestuurd naar de browser in de response hierboven.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const locale = pathname.split('/')[1] ?? 'nl';
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', ],
};
