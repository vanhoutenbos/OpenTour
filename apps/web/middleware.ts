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

  // Intl middleware eerst — geeft ons de response om cookies op te zetten
  const response = intlMiddleware(request);

  // Sessie refreshen op ALLE pagina's (niet alleen beschermde routes)
  // Zo wordt de access token automatisch ververst zolang de refresh token geldig is
  // en blijft de Navbar overal correct gesynchroniseerd
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          // Zet cookie op de response zodat browser hem ontvangt
          response.cookies.set(name, value, {
            ...options,
            path: '/',
            sameSite: 'lax',
            // 400 dagen — gebruiker blijft altijd ingelogd tenzij ze zelf uitloggen
            maxAge: options?.maxAge ?? 400 * 24 * 60 * 60,
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

  // getUser() doet een server-roundtrip en triggert automatisch token refresh
  // als de access token verlopen is maar de refresh token nog geldig is.
  // Dit is de enige betrouwbare manier om sessies in stand te houden.
  await supabase.auth.getUser();

  // Redirect naar login als beschermde route zonder sessie
  const needsAuth =
    pathname.includes('/dashboard') || pathname.includes('/manage');

  if (needsAuth) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const loginUrl = new URL(
        `/${pathname.split('/')[1]}/login`,
        request.url
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', ],
};
