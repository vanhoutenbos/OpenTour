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

  // Sessie verversen gebeurt op ELKE pagina, niet alleen beschermde routes.
  // Reden: het Supabase access token verloopt na 1 uur. Als de refresh alleen
  // op /dashboard, /manage etc. gebeurt, blijft de cookie op alle andere
  // pagina's (home, login, navbar-only routes) verlopen staan totdat de
  // gebruiker toevallig een beschermde route bezoekt. Gevolg: na een refresh
  // lijkt de gebruiker uitgelogd terwijl de cookie er nog wel is.
  //
  // We gebruiken getClaims() i.p.v. getUser() om dit zonder rate-limit-risico
  // te kunnen doen: getClaims() valideert het JWT lokaal via WebCrypto/JWKS
  // (geen netwerkcall) en ververst het token alleen via een netwerkcall als
  // het echt bijna verlopen is — precies wat we nodig hebben.
  // Zie: https://supabase.com/docs/guides/auth/server-side/creating-a-client
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

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;

  const needsAuth =
    pathname.includes('/dashboard') ||
    pathname.includes('/manage') ||
    pathname.includes('/tournament/new') ||
    pathname.includes('/course');

  if (needsAuth && !isAuthenticated) {
    const locale = pathname.split('/')[1] ?? 'nl';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', ],
};
