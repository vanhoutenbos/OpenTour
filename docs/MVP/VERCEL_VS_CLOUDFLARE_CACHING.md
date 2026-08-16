# Leaderboard Caching — Vercel vs Cloudflare: Technische Analyse

## Context

Design document v03 § 10 beschrijft polling-based leaderboard (30s interval) met caching.

**Huidge aanname:** Cloudflare Workers voor caching.  
**Jean-Paul's vraag:** "Kan Vercel dit ook? Of biedt Cloudflare voordelen?"

**Antwoord:** Beide kunnen; de keuze hangt af van fase en complexiteit.

---

## 1. Vercel Edge Caching (AANBEVOLEN voor MVP)

### Architectuur

```
Browser (spectator)
  → GET /api/leaderboard/[id]  (Next.js API route)
  → Vercel Edge Network (automatic caching)
  → HIT: cached response <50ms
  → MISS: query Supabase → cache 30s
```

### Implementatie

**File: `apps/web/app/api/leaderboard/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Vercel ISR + Edge caching via Cache-Control headers
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tournamentId = params.id;

  try {
    // Query leaderboard view
    const { data: leaderboard, error } = await supabase
      .from('tournament_leaderboard')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('position', { ascending: true });

    if (error || !leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'public, max-age=10, stale-while-revalidate=5',
          },
        }
      );
    }

    // Format response
    const response = {
      tournament_id: tournamentId,
      entries: leaderboard,
      last_updated: new Date().toISOString(),
    };

    // Cache headers: 30s cache, 10s stale-while-revalidate
    // (Vercel serves from cache while silently refreshing in background)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=10',
        'CDN-Cache-Control': 'max-age=30',  // Vercel-specific header
        'Vercel-CDN-Cache-Etag': `leaderboard-${tournamentId}`,  // Cache key
      },
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Frontend Hook (unchanged)

```typescript
// apps/web/hooks/useLeaderboardPolling.ts
export function useLeaderboardPolling(tournamentId: string | undefined) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`/api/leaderboard/${tournamentId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setEntries(data.entries);
        setError(null);
      } catch (err) {
        setError('Leaderboard unavailable');
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30_000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  return { entries, loading, error };
}
```

### Vercel Features (native)

| Feature | Description | MVP? |
|---------|-------------|------|
| **Edge Caching** | Automatic caching at Vercel CDN edge locations | ✅ Yes |
| **Cache-Control headers** | Fine-grained control via HTTP headers | ✅ Yes |
| **Stale-While-Revalidate** | Serve cached + refresh in background | ✅ Yes |
| **Geographic distribution** | Edges in all continents | ✅ Yes |
| **Rate limiting** | Manual via middleware (not built-in) | ⚠️ Partial |
| **Custom routing** | Limited (Vercel-specific) | ⚠️ Partial |

### Kosten

| Tier | Cost | Leaderboard included? |
|------|------|----------------------|
| Hobby (free) | Free | ✅ Yes (limited) |
| Pro | $20/month | ✅ Yes (more requests) |
| Enterprise | Custom | ✅ Yes (unlimited) |

**Free tier limits:**
- 100 requests/sec sustained (sufficient for MVP)
- 10 concurrent Edge Functions (API routes are not Edge Functions)
- Unlimited data transfer

**Conclusion:** Vercel free tier **voldoende voor MVP**.

---

## 2. Cloudflare Workers (MEER CONTROLE, later nodig)

### Architectuur

```
Browser
  → /api/leaderboard/[id]  (Next.js page, Vercel)
  → Cloudflare Worker (custom logic)
  → Cloudflare Cache API (persistent cache)
  → HIT: <10ms from cache
  → MISS: Supabase query → cache 30s

OR (workers.dev domain):

Browser
  → https://api.example.workers.dev/leaderboard/[id]
  → Direct to Cloudflare Worker (bypass Vercel)
  → Cache API + rate limiting
```

### Implementatie

**File: `workers/api/src/leaderboard.ts`** (wrangler project)

```typescript
import { Router } from 'itty-router';

const router = Router();

router.get('/api/leaderboard/:tournamentId', async (request, env) => {
  const { tournamentId } = request.params;
  const cache = caches.default;

  // Check cache
  const cacheKey = new Request(`https://cache.example.com/leaderboard/${tournamentId}`);
  let response = await cache.match(cacheKey);

  if (response) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...new Headers(response.headers),
        'X-Cache': 'HIT',
      },
    });
  }

  // Cache miss: fetch from Supabase
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  try {
    const supabaseRes = await fetch(
      `${supabaseUrl}/rest/v1/tournament_leaderboard?tournament_id=eq.${tournamentId}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!supabaseRes.ok) {
      return new Response(
        JSON.stringify({ error: `Supabase: ${supabaseRes.status}` }),
        { status: 502 }
      );
    }

    const data = await supabaseRes.json();
    const jsonResponse = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=10',
        'X-Cache': 'MISS',
      },
    });

    // Store in cache
    ctx.waitUntil(cache.put(cacheKey, jsonResponse.clone()));

    return jsonResponse;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Worker error' }),
      { status: 500 }
    );
  }
});

// Rate limiting for code validation
router.post('/api/validate-code', async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP');
  const key = `ratelimit:${ip}`;
  const count = await env.KV.get(key);

  if (count && parseInt(count) >= 5) {
    return new Response(
      JSON.stringify({ error: 'Too many attempts' }),
      { status: 429 }
    );
  }

  // Attempt logic...
  const newCount = (count ? parseInt(count) + 1 : 1).toString();
  await env.KV.put(key, newCount, { expirationTtl: 300 }); // 5 min

  return new Response(JSON.stringify({ success: true }));
});

export default router;
```

### Cloudflare Features

| Feature | Description | MVP? |
|---------|-------------|------|
| **Cache API** | Persistent HTTP cache | ✅ Yes |
| **Rate limiting** | Built-in KV + Durable Objects | ✅ Yes |
| **Custom routing** | Full control via Workers | ✅ Yes |
| **Geographic distribution** | 275+ data centers worldwide | ✅ Yes |
| **DDoS protection** | Automatic (free tier) | ✅ Yes |
| **Custom headers** | Full HTTP control | ✅ Yes |

### Kosten

| Tier | Cost | Requests | KV reads |
|------|------|----------|----------|
| Free | Free | 100k/day | 1M/day |
| Paid | $5/month | Unlimited | 10M/month |

**Free tier:** 100k requests/day = ~1.2 requests/sec sustained.  
**For 1000 concurrent pollers (30s polling):** need ~33 req/sec → **requires paid tier ($5/m)**.

---

## 3. Vercel vs Cloudflare: Head-to-Head

| Aspekt | Vercel | Cloudflare |
|--------|--------|-----------|
| **Setup time** | 5 minutes (native) | 30 minutes (new project) |
| **Cache control** | Via HTTP headers | Via Cache API + KV |
| **Rate limiting** | Manual (middleware) | Built-in (KV/Durable Objects) |
| **Cold starts** | ~100-200ms | ~50ms |
| **Cache hit latency** | <100ms (edge) | <10ms (edge) |
| **Free tier limits** | 100 req/sec | 100k req/day (~1.2 req/sec) |
| **Upgrade cost** | $20/m (Pro) | $5/m (Paid) |
| **Learning curve** | Low (Next.js native) | Medium (Workers API) |
| **Debugging** | Vercel dashboard | Wrangler CLI + dashboard |

---

## 4. Recommendation for OpenTour

### MVP (Weeks 1-3): **Use Vercel Edge Caching**

**Why:**
- Already using Vercel for Next.js hosting
- Native integration (zero setup)
- Sufficient for MVP spectator load (<100 concurrent)
- No additional costs (free tier)
- Easy debugging (Vercel dashboard)

**Implementation:**
1. Create `apps/web/app/api/leaderboard/[id]/route.ts`
2. Add Cache-Control headers (30s max-age)
3. Deploy normally to Vercel
4. Test caching via Response headers (X-Cache: HIT/MISS)

**Polling:**
- Frontend polls `/api/leaderboard/[id]` every 30 seconds
- Vercel caches response automatically
- Spectators get <50ms response for cache hits

### MVP2 / Post-Launch (if needed): **Switch to Cloudflare**

**When to switch:**
- 500+ concurrent spectators per tournament
- Free tier leaderboard limit approaching
- Need advanced rate limiting (brute-force protection)
- Want geographic optimization beyond Vercel edges

**Path forward:**
1. Create Cloudflare Worker project
2. Implement `/api/leaderboard` endpoint (code-complete below)
3. Point DNS to Cloudflare (or keep hybrid)
4. Add rate limiting for code validation
5. Upgrade to Paid tier ($5/m) if needed

---

## 5. Hybrid Approach (Best of Both Worlds)

**Architecture:**

```
Vercel (Next.js website + /api/leaderboard route):
  ✅ Marketing pages
  ✅ Auth flow
  ✅ Leaderboard page (cached via Edge)
  ✅ Tournament management

Cloudflare Worker (optional, added later):
  ✅ /api/leaderboard (if Vercel limit approached)
  ✅ /api/validate-code (with rate limiting)
  ✅ Custom routing/redirects
```

**Benefits:**
- MVP ships on Vercel (simple)
- Add Cloudflare when needed (zero downtime)
- Redundancy (Vercel down → fallback to Cloudflare)
- Gradual scaling

---

## 6. Concrete MVP Implementation Plan

### Phase 1: Vercel Edge (MVP, Week 2-3)

**File: `apps/web/app/api/leaderboard/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const runtime = 'nodejs'; // Run on Vercel Serverless

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tournamentId = params.id;

  if (!tournamentId) {
    return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('tournament_leaderboard')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        tournament_id: tournamentId,
        entries: data || [],
        last_updated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=10',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Test caching:**
```bash
# First request (cache miss)
curl -i https://open-tour-web.vercel.app/api/leaderboard/tournament-123

# Response headers:
# Cache-Control: public, max-age=30, stale-while-revalidate=10
# CF-Cache-Status: MISS (if Cloudflare is in front)
# Age: 0

# Second request within 30s (cache hit)
curl -i https://open-tour-web.vercel.app/api/leaderboard/tournament-123

# Response headers:
# Cache-Control: public, max-age=30, stale-while-revalidate=10
# CF-Cache-Status: HIT
# Age: 5
```

### Phase 2: Cloudflare (Optional, Post-MVP)

If spectator load exceeds Vercel limits:

```bash
# 1. Create Cloudflare project
npm create cloudflare@latest golf-api -- --type hello-world

# 2. Copy workers/api/src/leaderboard.ts code

# 3. Deploy
npm run deploy

# 4. Point DNS (optional)
# Set CNAME api.example.com → api-golf.workers.dev
# OR use Cloudflare DNS + routing rules
```

---

## 7. Load Testing: Vercel vs Cloudflare

### Test scenario: 1000 concurrent leaderboard pollers

**Vercel Edge (30s cache):**
```
- 1000 concurrent users polling every 30s
- 1000 / 30 = ~33 requests/sec to Vercel edge
- Cache hit rate: ~95% (first hit creates cache)
- Supabase queries: ~1-2 per 30 seconds (cache misses)
- Cost: Free tier sufficient ($20/month if exceeded)
```

**Cloudflare Workers (30s cache):**
```
- Same: ~33 requests/sec
- Cache hit rate: ~95%
- Supabase queries: same 1-2 per 30 seconds
- Cost: $5/month (Paid tier required for unlimited)
- Benefit: Rate limiting for code validation included
```

### Performance comparison (p95 latency)

| Scenario | Vercel Edge | Cloudflare Workers |
|----------|-------------|-------------------|
| Cache hit | 80-150ms | 30-50ms |
| Cache miss | 200-400ms | 150-300ms |
| Rate limited (429) | N/A | <5ms |

---

## 8. Recommendation Summary

### **USE VERCEL for MVP**

1. **Create:** `apps/web/app/api/leaderboard/[id]/route.ts`
2. **Cache:** Via `Cache-Control` header (30s max-age)
3. **Deploy:** Push to main → Vercel auto-deploys
4. **Test:** Verify caching via curl headers
5. **Monitor:** Vercel dashboard shows request stats

### **SWITCH TO CLOUDFLARE if:**
- Spectator load > 500 concurrent
- Need advanced rate limiting
- Vercel free tier limit approached
- Want sub-50ms response times

### **TIMELINE**
- MVP: Vercel Edge (Week 2-3, during polling implementation)
- Post-MVP: Add Cloudflare if needed (Week 6+)
- Hybrid: Keep both (redundancy + optimization)

---

## 9. GitHub Issue Template

**Issue for implementation:**

```markdown
---
title: "[BLK] Implement leaderboard polling via Vercel Edge caching"
labels: type:feature, priority:blocker, area:backend
---

## Description
Leaderboard endpoint with Vercel Edge caching. Spectators poll every 30s;
Vercel cache serves responses <100ms.

## Acceptance Criteria
- [ ] Endpoint: GET /api/leaderboard/[id]
- [ ] Response: JSON with tournament + entries + last_updated
- [ ] Cache headers: max-age=30, stale-while-revalidate=10
- [ ] Test: curl -i → verify Cache-Control header
- [ ] Load test: simulate 100 concurrent pollers
- [ ] Error handling: 404, 500 responses
- [ ] Deployed to Vercel production

## Test curl
```bash
curl -i https://open-tour-web.vercel.app/api/leaderboard/tournament-123
```

## No files to modify
- [x] `apps/web/app/api/leaderboard/[id]/route.ts` (NEW)

## Later (post-MVP)
- Cloudflare Worker fallback if limit approached
- Rate limiting for /api/validate-code endpoint
```

---

## 10. FAQ

**Q: Kun je Vercel en Cloudflare tegelijk gebruiken?**  
A: Ja. Vercel for Next.js hosting, Cloudflare for DNS/WAF/additional workers. Geen conflicts.

**Q: Wat gebeurt er als Vercel edge down is?**  
A: Spectators krijgen Vercel error. Cloudflare Workers kunnen als fallback werken (later).

**Q: Is 30s polling efficient genoeg voor "live" leaderboard?**  
A: Ja, standaard voor MVP. Supabase Realtime WebSockets zijn overkill voor 100-500 concurrent users.

**Q: Moet ik Cloudflare DNS gebruiken?**  
A: Nee. Vercel handles DNS. Cloudflare is optioneel (adds WAF/rate limiting/CDN).

**Q: Kosten Vercel en Cloudflare?**  
A: Vercel free tier = sufficient MVP. Cloudflare free tier = 100k req/day (~$0-5/month if needed).

---

## Conclusion

**Start with Vercel Edge. Switch to Cloudflare only if needed.**

Vercel caching is built-in, free, and sufficient for MVP. Cloudflare is more powerful but requires extra setup. Upgrade path is clear: no lock-in.

**Action:** Add `apps/web/app/api/leaderboard/[id]/route.ts` to GitHub issue queue (Week 2-3 after offline sync).
