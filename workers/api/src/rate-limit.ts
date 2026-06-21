import { Env } from './index';
import { CORS_HEADERS } from './cors';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 5 * 60; // 5 minuten

// In-memory rate limiting (per Worker instantie)
// Voor productie: gebruik Cloudflare KV voor persistente rate limiting
const attempts = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(request: Request): string {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
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

export async function handleCodeValidation(request: Request, env: Env): Promise<Response> {
  const key = getRateLimitKey(request);
  const { allowed, remaining, resetAt } = checkRateLimit(key);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Te veel pogingen',
        message: 'Wow Dechambeau, iets rustiger oké? Probeer het over 5 minuten opnieuw.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
          ...CORS_HEADERS(env),
        },
      }
    );
  }

  // Valideer de code bij Supabase
  try {
    const body = await request.json() as { code?: string };
    const code = body.code?.toUpperCase().trim();

    if (!code || code.length !== 8) {
      return new Response(
        JSON.stringify({ error: 'Ongeldige code — voer 8 tekens in' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(env) },
        }
      );
    }

    const supabaseResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/access_codes?code=eq.${code}&is_active=eq.true&select=id,tournament_id,expires_at`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const results = await supabaseResponse.json() as Array<{
      id: string;
      tournament_id: string;
      expires_at: string;
    }>;

    if (!results.length) {
      return new Response(
        JSON.stringify({ error: 'Code ongeldig of verlopen' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(remaining),
            ...CORS_HEADERS(env),
          },
        }
      );
    }

    const accessCode = results[0]!;
    if (new Date(accessCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Code verlopen — vraag een nieuwe code aan bij de organisator' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(env) },
        }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        tournamentId: accessCode.tournament_id,
        accessCodeId: accessCode.id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          ...CORS_HEADERS(env),
        },
      }
    );
  } catch (error) {
    console.error('Code validatie mislukt:', error);
    return new Response(
      JSON.stringify({ error: 'Validatie tijdelijk niet beschikbaar' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(env) },
      }
    );
  }
}
