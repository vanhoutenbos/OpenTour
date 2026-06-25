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

  // Refresh session voor beschermde routes
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
              response.cookies.set(name, value, { 
                ...options,
                path: '/',
                sameSite: 'lax',
              });
            });
          },
        },
      }
    );
    // Refresh de sessie en zorg dat cookies in response gaan
    console.log('[Middleware] Refreshing session for path:', pathname);
    const { data, error } = await supabase.auth.getUser();
    console.log('[Middleware] Session refresh:', { hasUser: !!data?.user, error: error?.message });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', ],
};
