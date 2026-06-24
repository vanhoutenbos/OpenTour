import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Hardcoded productie URL — nooit afhankelijk van request origin
// zodat Vercel preview deployments niet de verkeerde kant opsturen
const PRODUCTION_URL = 'https://open-tour-web.vercel.app';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${PRODUCTION_URL}/nl/dashboard`);
    }
    console.error('PKCE fout:', error.message);
  }

  // token_hash flow (dev magic link + email OTP)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email',
    });
    if (!error) {
      return NextResponse.redirect(`${PRODUCTION_URL}/nl/dashboard`);
    }
    console.error('token_hash fout:', error.message);
  }

  return NextResponse.redirect(`${PRODUCTION_URL}/nl/login?error=auth`);
}
