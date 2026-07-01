import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
type SupabaseCookie = { name: string; value: string; options?: CookieOptions };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash') ?? searchParams.get('token');
  const type = searchParams.get('type');

  console.log('Auth callback ontvangen:', { code: !!code, token_hash: !!token_hash, type, origin });

  const response = NextResponse.redirect(`${origin}/nl/login?error=auth`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(({ name, value, options }: SupabaseCookie) => {
            response.cookies.set(name, value, {
              ...(options as CookieOptions | undefined),
              path: options?.path ?? '/',
              sameSite: options?.sameSite ?? 'lax',
              maxAge: options?.maxAge ?? TEN_YEARS_IN_SECONDS,
            });
          });
        },
      },
    }
  );

  // PKCE flow
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log('PKCE result:', { 
      user: data?.user?.email, 
      error: error?.message,
      hasSession: !!data?.session,
      sessionExpiry: data?.session?.expires_at
    });
    if (!error && data?.session) {
      console.log('✅ PKCE succesvol - redirect naar dashboard');
      response.headers.set('Location', `${origin}/nl/dashboard`);
      return response;
    }
  }

  // token_hash flow (OTP/Magic Link)
  if (token_hash) {
    const otp_type = (type === 'magiclink' ? 'email' : type) as 'email';
    console.log('OTP verificatie gestart:', { token_hash: token_hash.substring(0, 10) + '...', otp_type });
    
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: otp_type });
    
    console.log('OTP result:', { 
      user: data?.user?.email, 
      error: error?.message,
      hasSession: !!data?.session,
      sessionExpiry: data?.session?.expires_at,
      userId: data?.user?.id
    });
    
    if (!error && data?.session) {
      console.log('✅ OTP succesvol - redirect naar dashboard');
      response.headers.set('Location', `${origin}/nl/dashboard`);
      return response;
    }
    
    if (error) {
      console.error('❌ OTP fout:', error);
    }
  }

  console.log('Auth callback mislukt — redirect naar login');
  return response;
}
