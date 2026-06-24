import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const PRODUCTION_URL = 'https://open-tour-web.vercel.app';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash') ?? searchParams.get('token');
  const type = searchParams.get('type'); // 'email', 'magiclink', etc.

  console.log('Auth callback params:', { code, token_hash, type });

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // PKCE flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${PRODUCTION_URL}/nl/dashboard`);
    console.error('PKCE fout:', error.message);
  }

  // token_hash flow — Supabase gebruikt 'email' als type voor magiclinks
  if (token_hash) {
    // Normaliseer type: 'magiclink' → 'email'
    const otp_type = type === 'magiclink' ? 'email' : (type as 'email' ?? 'email');
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: otp_type });
    if (!error) return NextResponse.redirect(`${PRODUCTION_URL}/nl/dashboard`);
    console.error('token_hash fout:', error.message);
  }

  return NextResponse.redirect(`${PRODUCTION_URL}/nl/login?error=auth`);
}
