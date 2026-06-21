import { Env } from './index';

export const CORS_HEADERS = (env: Env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
});

export function corsResponse(env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS(env),
  });
}

export function addCorsHeaders(response: Response, env: Env, cacheStatus: 'HIT' | 'MISS'): Response {
  const newResponse = new Response(response.body, response);
  const headers = CORS_HEADERS(env);
  Object.entries(headers).forEach(([k, v]) => newResponse.headers.set(k, v));
  newResponse.headers.set('X-Cache', cacheStatus);
  return newResponse;
}
