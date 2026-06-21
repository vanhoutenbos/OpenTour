/**
 * OpenTour — Cloudflare Worker
 *
 * Verantwoordelijkheden:
 * - GET /api/leaderboard/:id  — gecachte leaderboard data (Cache API, TTL 30s)
 * - POST /api/validate-code   — toegangscode validatie met rate limiting
 *
 * Score-invoer (POST /scores) gaat DIRECT naar Supabase, niet via deze Worker.
 * De Worker zit alleen tussen GET-requests die gecached kunnen worden.
 */

import { handleLeaderboard } from './leaderboard';
import { handleCodeValidation } from './rate-limit';
import { CORS_HEADERS, corsResponse } from './cors';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(env);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'opentour-worker' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(env) },
      });
    }

    // GET /api/leaderboard/:tournamentId
    if (request.method === 'GET' && url.pathname.startsWith('/api/leaderboard/')) {
      return handleLeaderboard(request, env, ctx);
    }

    // POST /api/validate-code — toegangscode validatie + rate limiting
    if (request.method === 'POST' && url.pathname === '/api/validate-code') {
      return handleCodeValidation(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
