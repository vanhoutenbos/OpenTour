import { Env } from './index';
import { CORS_HEADERS, addCorsHeaders } from './cors';

const CACHE_TTL_SECONDS = 30;

export async function handleLeaderboard(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const tournamentId = url.pathname.split('/')[3];

  if (!tournamentId) {
    return new Response(JSON.stringify({ error: 'Tournament ID vereist' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(env) },
    });
  }

  const cacheKey = new Request(`${url.origin}/cache/leaderboard/${tournamentId}`);
  const cache = caches.default;

  // Check Cloudflare Cache API
  const cached = await cache.match(cacheKey);
  if (cached) {
    return addCorsHeaders(cached, env, 'HIT');
  }

  // Cache miss: haal data op bij Supabase
  try {
    const supabaseResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/tournament_leaderboard?tournament_id=eq.${tournamentId}&select=*&order=position.asc`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!supabaseResponse.ok) {
      throw new Error(`Supabase fout: ${supabaseResponse.status}`);
    }

    const data = await supabaseResponse.json();

    const jsonResponse = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=10`,
        ...CORS_HEADERS(env),
        'X-Cache': 'MISS',
      },
    });

    // Sla op in Cloudflare cache (asynchroon — blokkeert response niet)
    ctx.waitUntil(cache.put(cacheKey, jsonResponse.clone()));

    return jsonResponse;
  } catch (error) {
    console.error('Leaderboard ophalen mislukt:', error);
    return new Response(
      JSON.stringify({ error: 'Leaderboard tijdelijk niet beschikbaar' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(env) },
      }
    );
  }
}
