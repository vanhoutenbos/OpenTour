import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
type SupabaseCookie = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/auth/callback') {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/nl', request.url));
  }

  const response = NextResponse.next();

  // Sessie verversen op elke pagina
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
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
