import { createServerClient, type CookieOptions } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
});

const PROTECTED = ['/dashboard', '/manage', '/tournament/new', '/course/new'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/auth/callback') return NextResponse.next();

  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          response.cookies.set(name, value, {
            ...options,
            path: '/',
            sameSite: 'lax',
            maxAge: options?.maxAge ?? 400 * 24 * 60 * 60,
          });
        },
        remove: (name: string, options?: CookieOptions) => {
          response.cookies.set(name, '', { ...options, path: '/', sameSite: 'lax', maxAge: 0 });
        },
      },
    }
  );

  // Één getUser() call — refresht token én geeft user terug
  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some(p => pathname.includes(p));
  if (isProtected && !user) {
    const locale = pathname.split('/')[1] ?? 'nl';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Al ingelogd op login pagina → stuur door naar dashboard
  if (pathname.endsWith('/login') && user) {
    const locale = pathname.split('/')[1] ?? 'nl';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)',],
};
