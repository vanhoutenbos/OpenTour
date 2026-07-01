import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
});

const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
type SupabaseCookie = { name: string; value: string; options?: CookieOptions };

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
    pathname.includes('/course');

  if (needsAuth) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: SupabaseCookie[]) {
            // Hou request en response cookie-state synchroon.
            // Dit voorkomt dat sessies sporadisch "verdwijnen" bij harde reloads.
            cookiesToSet.forEach(({ name, value }: SupabaseCookie) => {
              request.cookies.set(name, value);
            });

            cookiesToSet.forEach(({ name, value, options }: SupabaseCookie) => {
              response.cookies.set(name, value, {
                ...(options as CookieOptions | undefined),
                path: '/',
                sameSite: 'lax',
                maxAge: options?.maxAge ?? TEN_YEARS_IN_SECONDS,
              });
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
