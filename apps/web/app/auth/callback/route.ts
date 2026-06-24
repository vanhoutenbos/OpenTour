import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const PRODUCTION_URL = 'https://open-tour-web.vercel.app';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash') ?? searchParams.get('token');
  const type = searchParams.get('type');

  console.log('Auth callback ontvangen:', { code: !!code, token_hash: !!token_hash, type });

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log('PKCE result:', { user: data?.user?.email, error: error?.message });
    if (!error) return NextResponse.redirect(`${PRODUCTION_URL}/nl/dashboard`);
  }

  // token_hash flow
  if (token_hash) {
    const otp_type = (type === 'magiclink' ? 'email' : type) as 'email';
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: otp_type });
    console.log('OTP result:', { user: data?.user?.email, error: error?.message });
    if (!error) return NextResponse.redirect(`${PRODUCTION_URL}/nl/dashboard`);
  }

  console.log('Auth callback mislukt — redirect naar login');
  return NextResponse.redirect(`${PRODUCTION_URL}/nl/login?error=auth`);
}
