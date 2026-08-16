import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60;
const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;

const attempts = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  const ipFromXff = typeof xff === 'string' ? xff.split(',')[0]?.trim() : null;
  const ip = ipFromXff ?? 'unknown';
  return `rl:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_SECONDS * 1000 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetAt: entry.resetAt };
}

interface AccessCodeRow {
  id: string;
  tournament_id: string;
  expires_at: string;
  is_active: boolean;
}

interface RecorderSession {
  tournamentId: string;
  accessCodeId: string;
  expiresAt: string;
}

export async function POST(request: NextRequest) {
  const key = getRateLimitKey(request);
  const { allowed, remaining, resetAt } = checkRateLimit(key);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Te veel pogingen', retryAfter },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const body = await request.json() as { code?: string };
    const code = body.code?.toUpperCase().trim();

    if (!code || code.length !== 8) {
      return NextResponse.json(
        { error: 'Ongeldige code — voer 8 tekens in' },
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/access_codes?code=eq.${code}&is_active=eq.true&select=id,tournament_id,expires_at,is_active&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Validatie mislukt' },
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    const rows: AccessCodeRow[] = await res.json();

    if (!rows.length) {
      return NextResponse.json(
        { error: 'Code ongeldig of verlopen' },
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    const accessCode = rows[0]!;

    if (new Date(accessCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Code verlopen — vraag een nieuwe code aan bij de organisator' },
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    const response = NextResponse.json(
      { valid: true, tournamentId: accessCode.tournament_id },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    );

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                path: '/',
                sameSite: 'lax',
                maxAge: options?.maxAge ?? TEN_YEARS_IN_SECONDS,
              });
            });
          },
        },
      }
    );

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Aanmelding mislukt' },
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining) } }
      );
    }

    const userId = authData.user.id;

    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    await adminSupabase.from('recorder_sessions').upsert(
      {
        user_id: userId,
        access_code_id: accessCode.id,
        tournament_id: accessCode.tournament_id,
        expires_at: accessCode.expires_at,
      },
      { onConflict: 'user_id,tournament_id' }
    );

    const session: RecorderSession = {
      tournamentId: accessCode.tournament_id,
      accessCodeId: accessCode.id,
      expiresAt: accessCode.expires_at,
    };

    response.cookies.set('recorder_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(accessCode.expires_at),
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Validatie mislukt' },
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(remaining) } }
    );
  }
}
