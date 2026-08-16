# GitHub Workflow — OpenTour MVP Execution

## 📌 Filosofie: Issues vs PR vs Project

**Issues zijn NIET alleen voor bugs.** In dit project gebruiken we issues voor:
- ✅ Features (e.g., "Implement upsert_score_if_newer() function")
- ✅ Documentation (e.g., "Write API contract")
- ✅ Refactoring (e.g., "Course redesign: 4-tab layout")
- ✅ Bugs (e.g., "RLS policy allows data leak")
- ✅ Tech debt (e.g., "Add PWA offline sync")

**Pull Requests** implementeren één of meerdere issues.

**Project board** organiseert issues in kolommen:
- `Backlog` → `Ready` → `In Progress` → `In Review` → `Done`

---

## 🎯 MVP Execution Structure

Gegeven:
- **Matchplay MOET in MVP** (ivm ladder competition)
- **Leaderboard polling LATER** (maar Vercel kan caching doen via Next.js API Routes)
- **API contract is NODIG**

### Vercel vs Cloudflare Caching — kort advies

**Vercel (Next.js route caching):**
```typescript
// app/api/leaderboard/[id]/route.ts
export async function GET(request, { params }) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=10'
    }
  });
}
```
- ✅ Eenvoudig: cache headers in Next.js
- ✅ Gratis (in Vercel)
- ✅ Edge caching in Vercel's netwerk (wereldwijd)
- ❌ Niet beschikbaar in MVP-fase 1 (polling later)

**Cloudflare Workers (meer controle):**
- ✅ Expliciete Cache API
- ✅ Rate limiting built-in
- ✅ Unabhängig van Vercel
- ❌ Extra setup nodig
- ⚠️ Later als performance issues

**Aanbeveling:** Start met **Vercel caching** (Next.js routes). Switch naar **Cloudflare Workers** als polling in MVP2 nodig wordt.

---

## 📊 GitHub Project Structure

### Blok 1: Database & Migrations (Week 1)

```
GitHub Project: "OpenTour MVP"
Column: "Database & Security"

Issue #101: [BLK] Implement upsert_score_if_newer() Postgres function
Issue #102: [BLK] Test RLS policies — recorder scope security audit
Issue #103: [BLK] Fix matchplay schema — ladder seeding implementation
Issue #104: Dry-run all migrations against staging database
Issue #105: Add pg-tap unit tests for RLS policies (5 test cases)
```

### Blok 2: Offline Sync (Week 2)

```
Column: "PWA & Offline"

Issue #201: [BLK] Implement IndexedDB schema (Dexie.js) for pending scores
Issue #202: [BLK] Add navigator.onLine event handler — sync trigger
Issue #203: [BLK] Implement Service Worker config (next-pwa)
Issue #204: [BLK] Build offline sync flow (submitScore → upsert_score_if_newer)
Issue #205: Add sync status badges (online/offline/syncing/error)
Issue #206: Test PWA offline on iOS Safari 14.3+ and Android Chrome 8.0+
Issue #207: E2E test: offline score → reconnect → sync → leaderboard
```

### Blok 3: Matchplay & Ladder (Week 2-3)

```
Column: "Matchplay & Ladder"

Issue #301: [BLK] Implement ladder seeding algorithm (3 methods)
Issue #302: [BLK] Build challenge/match entry flow (backend + API)
Issue #303: [BLK] Implement match result scoring (W/L/draw)
Issue #304: [BLK] Ladder board rung promotion/demotion logic
Issue #305: Build ladder UI — board + pairings visualization
Issue #306: Build challenge request UI (send/accept/decline)
Issue #307: Test ladder with 8+ players (promotion conflicts, ties)
Issue #308: Document ladder rules (WebSocket/polling updates)
```

### Blok 4: Course Redesign (Week 3)

```
Column: "Course Management"

Issue #401: [BLK] Course management 4-tab layout (Algemeen | Tees | Holes | Lussen)
Issue #402: Tab 1 — Algemeen: name/location/country form
Issue #403: Tab 2 — Tees: CRUD with rating inputs (slope/course)
Issue #404: Tab 3 — Holes: per-tee distance/par overrides + SI required
Issue #405: Tab 4 — Lussen: loop definitions + hole assignments
Issue #406: Add form validation (holes_count matches loop setup)
Issue #407: Responsive test: course management on mobile/tablet/desktop
```

### Blok 5: API & Documentation (Week 2-3)

```
Column: "API & Docs"

Issue #501: [BLK] Create API contract — leaderboard GET endpoint
Issue #502: [BLK] Create API contract — scores POST endpoint
Issue #503: [BLK] Create API contract — access code validation endpoint
Issue #504: Document error responses (400, 401, 403, 429, 500)
Issue #505: Document rate limiting behavior (5 attempts / 5min per IP)
Issue #506: Add API examples (curl, JavaScript, TypeScript)
Issue #507: Document self-hosting setup (Docker Compose stack)
Issue #508: Write troubleshooting guide (common errors + solutions)
```

### Blok 6: Testing & Launch Prep (Week 4)

```
Column: "Testing & Launch"

Issue #601: [BLK] End-to-end test: organizer → recorder → spectator
Issue #602: [BLK] Load testing setup (k6 or Locust configuration)
Issue #603: Run load test: 1000 concurrent leaderboard pollers
Issue #604: Security audit: RLS policies + CORS + CSP headers
Issue #605: Accessibility audit (WCAG 2.1 AA)
Issue #606: Manual testing: real golf club pilot (20-30 players)
Issue #607: Performance profiling (Lighthouse + DevTools)
Issue #608: Fix critical bugs from pilot
Issue #609: Final deployment checklist
Issue #610: Launch announcement + documentation
```

---

## 📋 GitHub Issues Template

### Issue Label System

Create these labels in GitHub:

```
Type:
  - type:feature (new feature)
  - type:bug (bug fix)
  - type:docs (documentation)
  - type:refactor (code quality/tech debt)
  - type:test (testing)

Priority:
  - priority:blocker (must have for MVP launch)
  - priority:high (should have in MVP)
  - priority:medium (nice to have)
  - priority:low (nice to have, can defer)

Status:
  - status:ready (ready to pick up)
  - status:in-progress (actively being worked on)
  - status:review (PR submitted, awaiting review)
  - status:blocked (waiting on something)

Area:
  - area:database (migrations, schema)
  - area:backend (API routes, business logic)
  - area:frontend (UI, components)
  - area:pwa (offline, service worker)
  - area:security (RLS, auth, CORS)
  - area:docs (documentation)
```

### Issue Template: Feature

Create file `.github/ISSUE_TEMPLATE/feature.md`:

```markdown
---
name: Feature Implementation
about: Implement a feature for OpenTour MVP
title: "[FEATURE] Brief description"
labels: type:feature, priority:high
---

## Description
Concise description of what this feature does.

## Context
Why is this needed? Link to design document sections if applicable.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
- [ ] Tests pass (unit + integration)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Code review approved
- [ ] Merged to main

## Technical Details
- **Implementation area:** frontend/backend/database
- **Dependencies:** List other issues this depends on
- **Estimated time:** X hours
- **Owner:** @person (if assigned)

## Testing Strategy
- Unit tests: ...
- Integration tests: ...
- Manual testing: ...

## Notes
Any additional context or gotchas.
```

### Issue Template: Blocker

Create file `.github/ISSUE_TEMPLATE/blocker.md`:

```markdown
---
name: MVP Blocker
about: Critical issue blocking MVP launch
title: "[BLK] Brief description"
labels: type:feature, priority:blocker
---

## Why This Blocks MVP
Explain impact if not fixed.

## Current Status
- What's done?
- What's missing?

## Deliverables
- [ ] Implementation complete
- [ ] Dry-run tested (if database)
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration test passes
- [ ] Security review (if applicable)
- [ ] Documentation updated
- [ ] PR merged to main

## Estimated Timeline
- Start: Week X, Day Y
- End: Week X, Day Z
- Hours: X

## Owner
@person responsible for completing this.
```

---

## 📝 Detailed GitHub Issues — Week 1

### Issue #101: [BLK] Implement upsert_score_if_newer() Postgres function

```markdown
---
name: Blocker #101
title: "[BLK] Implement upsert_score_if_newer() Postgres function"
labels: type:feature, priority:blocker, area:database
---

## Description
Offline sync requires conflict resolution: when two recorders enter the same hole's score,
the one with the newer timestamp should win. This Postgres function enforces that logic.

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 9.4, § 7.2

## Acceptance Criteria
- [ ] Function `upsert_score_if_newer()` created in Postgres
- [ ] Accepts: tournament_id, player_id, hole_id, round_number, strokes, updated_at
- [ ] Returns: score_id, was_updated (boolean)
- [ ] Dry-run tested against staging database (3 test cases)
- [ ] Unit test: newer timestamp overwrites older
- [ ] Unit test: older timestamp doesn't overwrite newer
- [ ] Unit test: insert new score if not exists
- [ ] Migration file created: `supabase/migrations/20260XXX_upsert_score_if_newer.sql`
- [ ] No TypeScript errors
- [ ] Documented in README (server-side RPC usage)

## Testing Checklist
```sql
-- Test 1: Insert new score
BEGIN; SELECT upsert_score_if_newer(...); ROLLBACK;

-- Test 2: Newer timestamp wins
BEGIN;
  -- Insert old timestamp
  -- Update with new timestamp
  -- Verify: strokes = new value
ROLLBACK;

-- Test 3: Older timestamp loses
BEGIN;
  -- Insert new timestamp
  -- Try to update with old timestamp
  -- Verify: strokes = original value
ROLLBACK;
```

## Implementation References
- Postgres docs: `ON CONFLICT ... DO UPDATE`
- Example: `apps/web/__tests__/upsert-score.test.ts` (See TECHNISCH_IMPLEMENTATIE.md)
- Supabase RPC calling: `supabase.rpc('upsert_score_if_newer', {...})`

## Files to Create/Modify
- [ ] `supabase/migrations/20260XXX_upsert_score_if_newer.sql` (NEW)
- [ ] `apps/web/__tests__/upsert-score.test.ts` (NEW)
- [ ] `apps/web/hooks/useScoreSync.ts` (UPDATE — add submitScore function)

## Estimated Time
2-4 hours

## Owner
@backend-specialist

## Related
- Blocks: #202 (offline sync implementation)
- Blocked by: None
- Design doc: golf-app-design-document-v03-definitief.md
```

### Issue #102: [BLK] Test RLS policies — recorder scope security audit

```markdown
---
name: Blocker #102
title: "[BLK] Test RLS policies — recorder scope security audit"
labels: type:test, priority:blocker, area:security
---

## Description
RLS policies are incomplete. Recorder with access code can potentially see/modify
scores from other tournaments. Security audit + fix required.

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 8.4, § 7.4

## Current Issues
1. `recorder_insert_score` policy checks if ERGO valid code exists, not if THIS user has it
2. No JWT linking between access_code and user session
3. Tournament status transitions not RLS-enforced (paused prevents score entry?)

## Acceptance Criteria
- [ ] Audit: Extract all pg_policies for `scores`, `tournaments`, `access_codes`
- [ ] Fix: Implement `is_recorder_for_tournament()` helper function
- [ ] Fix: Recorder scope NOW limited to single tournament per access_code
- [ ] Test: pg-tap unit test file created with 5 test cases
- [ ] Test: Test 1 — Organizer can insert scores for own tournament
- [ ] Test: Test 2 — Recorder with valid code can insert for that tournament
- [ ] Test: Test 3 — Recorder without code cannot insert
- [ ] Test: Test 4 — Public leaderboard readable without auth
- [ ] Test: Test 5 — Draft tournaments invisible to unauthorized users
- [ ] Manual verification: checklist from TECHNISCH_IMPLEMENTATIE.md
- [ ] Security review: External pair review (if available)
- [ ] Migration: `supabase/migrations/20260XXX_fix_recorder_rls.sql`
- [ ] Documentation: RLS policy summary in `docs/security.md`

## Testing Strategy
**Automated (pg-tap):**
```sql
-- Setup test users, access codes, tournaments
-- Test each scenario
-- Verify: INSERT succeeds/fails as expected
```

**Manual (Supabase Dashboard):**
- Login as recorder with code → can see only that tournament's scores
- Login as recorder without code → cannot see any scores
- Login as organizer → see all own tournament scores
- Unauthenticated → see public leaderboard only

## Files to Create/Modify
- [ ] `supabase/migrations/20260XXX_fix_recorder_rls.sql` (NEW)
- [ ] `supabase/tests/rls_policies.sql` (NEW)
- [ ] `docs/security.md` (NEW or UPDATE)
- [ ] `apps/web/app/api/auth/code-login/route.ts` (UPDATE — session linking)

## Estimated Time
6-8 hours (including manual testing)

## Owner
@security-specialist / @backend-specialist

## Related
- Blocks: #202, #301 (offline sync, matchplay)
- Blocked by: None
- Dependencies: #101 (upsert function, for testing context)
```

### Issue #103: [BLK] Implement matchplay schema — ladder seeding

```markdown
---
name: Blocker #103
title: "[BLK] Implement matchplay schema — ladder seeding"
labels: type:feature, priority:blocker, area:database
---

## Description
Ladder competitions are in MVP scope. Schema exists but seeding algorithm not implemented.
Need to support 3 seeding methods: random, handicap ascending, handicap descending.

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 7.2 (matchplay_pairings, ladder fields)

## Acceptance Criteria
- [ ] Seeding algorithm: Random (Fisher-Yates shuffle)
- [ ] Seeding algorithm: Handicap ascending (best to bottom rung)
- [ ] Seeding algorithm: Handicap descending (best to top rung)
- [ ] Postgres function: `ladder_seed_rungs(tournament_id, seeding_method)` created
- [ ] Function populates: `matchplay_pairings` table with initial assignments
- [ ] Handles ties: multiple players with same handicap
- [ ] Pyramid rung growth logic: double vs linear (check ladder_rung_growth enum)
- [ ] Dry-run tested: seed 8 players in random ladder
- [ ] Dry-run tested: seed 12 players with handicap method
- [ ] Unit test: verify distribution across rungs (no single rung overpopulated)
- [ ] Integration test: organize ladder tournament end-to-end
- [ ] Migration: `supabase/migrations/20260XXX_ladder_seeding.sql`

## Technical Details
**Rung structure:**
```
Rung 1: 1 player (champion)
Rung 2: 2 players
Rung 3: 4 players
Rung 4: 8 players  (pyramid_double)
OR
Rung 1-N: linear growth (pyramid_linear)
```

**Seeding:**
- Assign players to rungs based on method
- Create matchplay_pairings: (player_a, player_b, rung)
- For Rung 1, only 1 player = bye (automatically advances)

## Files to Create/Modify
- [ ] `supabase/migrations/20260XXX_ladder_seeding.sql` (NEW)
- [ ] `apps/web/lib/ladder-seeding.ts` (NEW — utility functions)
- [ ] `apps/web/__tests__/ladder-seeding.test.ts` (NEW)

## Estimated Time
4-6 hours

## Owner
@backend-specialist

## Related
- Blocks: #302, #305 (challenge flow, ladder UI)
- Blocked by: #102 (RLS — for testing context)
```

---

## 📝 Detailed GitHub Issues — Week 2 (Offline Sync)

### Issue #201: [BLK] Implement IndexedDB schema (Dexie.js)

```markdown
---
name: Blocker #201
title: "[BLK] Implement IndexedDB schema (Dexie.js) for pending scores"
labels: type:feature, priority:blocker, area:pwa
---

## Description
PWA offline scoring requires local storage. IndexedDB via Dexie.js stores pending scores
until network returns and sync completes.

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 9.2

## Acceptance Criteria
- [ ] Add `dexie@^4.0.0` to `package.json`
- [ ] Create `apps/web/lib/db.ts` — Dexie database instance
- [ ] Table schema: `pending_scores` with columns:
  - localId (UUID string, primary key)
  - tournament_id, player_id, hole_id, round_number
  - strokes, updated_at
  - synced (boolean), sync_error (optional string)
- [ ] Table schema: `cached_tournaments`, `cached_flights` (for offline leaderboard access)
- [ ] Indexes: by tournament_id, by synced status
- [ ] Transaction support: multi-row operations atomic
- [ ] Type safety: TypeScript interfaces match database schema
- [ ] Test: Insert pending score → verify retrieval
- [ ] Test: Query by tournament_id → returns correct scores
- [ ] Test: Update synced status → works correctly
- [ ] Test: Clear old cached data (cleanup strategy)

## Implementation Notes
```typescript
// File: apps/web/lib/db.ts
import Dexie, { type Table } from 'dexie';

interface PendingScore {
  localId: string;
  tournament_id: string;
  player_id: string;
  hole_id: string;
  round_number: number;
  strokes: number;
  updated_at: string;
  synced: boolean;
  sync_error?: string;
}

class ScoreDB extends Dexie {
  pending_scores!: Table<PendingScore>;
  
  constructor() {
    super('golf-app-db');
    this.version(1).stores({
      pending_scores: 'localId, tournament_id, synced'
    });
  }
}

export const db = new ScoreDB();
```

## Files to Create/Modify
- [ ] `apps/web/lib/db.ts` (NEW)
- [ ] `apps/web/__tests__/db.test.ts` (NEW)
- [ ] `package.json` (ADD dexie dependency)

## Estimated Time
2-3 hours

## Owner
@frontend-specialist

## Related
- Blocks: #202, #204 (sync event handler, full sync flow)
- Depends on: #101 (upsert function exists on backend)
```

### Issue #202: [BLK] Add navigator.onLine event handler — sync trigger

```markdown
---
name: Blocker #202
title: "[BLK] Add navigator.onLine event handler — sync trigger"
labels: type:feature, priority:blocker, area:pwa
---

## Description
When device regains network, sync pending scores to Supabase using upsert_score_if_newer RPC.

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 9.3

## Acceptance Criteria
- [ ] Hook: `useSyncOnlineStatus()` — listen to navigator.onLine
- [ ] Trigger sync when 'online' event fires
- [ ] Fetch all pending_scores where synced=false
- [ ] For each: call `upsert_score_if_newer()` RPC
- [ ] On success: mark synced=true in IndexedDB
- [ ] On error: log sync_error message, retry on next online
- [ ] Exponential backoff: 1s, 2s, 4s, 8s max between retries
- [ ] UI: show sync status (pending count, last sync time)
- [ ] Handle partial failures: some sync, some fail
- [ ] Test: simulate offline → online → verify sync triggered
- [ ] Test: 5 pending scores, 3 succeed, 2 fail → correct status
- [ ] Integration test: end-to-end offline scenario

## Implementation Notes
```typescript
// File: apps/web/hooks/useSyncOnlineStatus.ts
export function useSyncOnlineStatus() {
  useEffect(() => {
    const handleOnline = async () => {
      await syncPendingScores();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}

// File: apps/web/lib/sync.ts
async function syncPendingScores() {
  const pending = await db.pending_scores
    .where('synced').equals(false)
    .toArray();

  for (const score of pending) {
    try {
      const { data, error } = await supabase.rpc('upsert_score_if_newer', {
        p_tournament_id: score.tournament_id,
        p_player_id: score.player_id,
        p_hole_id: score.hole_id,
        p_round_number: score.round_number,
        p_strokes: score.strokes,
        p_updated_at: score.updated_at,
      });

      if (!error) {
        await db.pending_scores.update(score.localId, { synced: true });
      } else {
        await db.pending_scores.update(score.localId, { sync_error: error.message });
      }
    } catch (err) {
      await db.pending_scores.update(score.localId, { 
        sync_error: err instanceof Error ? err.message : 'Unknown' 
      });
    }
  }
}
```

## Files to Create/Modify
- [ ] `apps/web/hooks/useSyncOnlineStatus.ts` (NEW)
- [ ] `apps/web/lib/sync.ts` (NEW)
- [ ] `apps/web/__tests__/sync.test.ts` (NEW)
- [ ] `apps/web/hooks/useScoreSync.ts` (UPDATE from #101)

## Estimated Time
3-4 hours

## Owner
@frontend-specialist

## Related
- Depends on: #101 (upsert function), #201 (IndexedDB schema)
- Blocks: #204, #205, #207 (full flow, UI badge, E2E test)
```

### Issue #203: [BLK] Implement Service Worker config (next-pwa)

```markdown
---
name: Blocker #203
title: "[BLK] Implement Service Worker config (next-pwa)"
labels: type:feature, priority:blocker, area:pwa
---

## Description
Service Worker caches app shell for offline availability. Users can use scorer app offline
after first visit (even if connection drops).

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 9.1, § 9.2

## Acceptance Criteria
- [ ] Install `next-pwa@^5.0.0` (or latest compatible version)
- [ ] Create `public/manifest.json` (PWA manifest):
  - App name: "OpenTour"
  - Icons: 192x192, 512x512
  - Start URL: `/scorer`
  - Display: standalone
  - Theme color: primary brand color
- [ ] Configure in `next.config.js`:
  ```javascript
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: false,
  });
  ```
- [ ] Service Worker caches:
  - App shell HTML/CSS/JS
  - Static assets (/public/*)
  - API routes (offline handling)
- [ ] Cache strategy: NetworkFirst for API, CacheFirst for assets
- [ ] Offline page: custom offline fallback UI (optional for MVP)
- [ ] Test: Install PWA on phone → go offline → app still loads
- [ ] Test: iOS Safari 14.3+ installation works
- [ ] Test: Android Chrome installation works
- [ ] Verify: no TypeScript errors
- [ ] Documentation: PWA installation UX guide

## Configuration Notes
**next.config.js:**
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: false,
  // For scorer app routes:
  sw: 'service-worker.js',
  buildExcludes: [
    /middleware-manifest.json$/,
  ],
  publicExcludes: ['!noprecache/**/*'],
});

module.exports = withPWA({
  // ... rest of next.config
});
```

**manifest.json:**
```json
{
  "name": "OpenTour",
  "short_name": "OpenTour",
  "description": "Open-source golf tournament platform",
  "start_url": "/scorer",
  "display": "standalone",
  "theme_color": "#234B39",
  "background_color": "#F8F6F1",
  "icons": [...]
}
```

## Files to Create/Modify
- [ ] `public/manifest.json` (NEW)
- [ ] `next.config.js` (UPDATE — add withPWA)
- [ ] `package.json` (ADD next-pwa)
- [ ] `public/service-worker.js` (NEW if custom needed)

## Estimated Time
2-3 hours

## Owner
@frontend-specialist

## Related
- Depends on: #201, #202 (IndexedDB + sync handlers)
- Blocks: #206, #207 (device testing, E2E)
```

---

## 📝 Detailed GitHub Issues — Week 2 (API & Matchplay)

### Issue #501: [BLK] Create API contract — all endpoints

```markdown
---
name: Blocker #501
title: "[BLK] Create API contract — leaderboard, scores, code validation endpoints"
labels: type:docs, priority:blocker, area:backend
---

## Description
Define formal API contract for all MVP endpoints:
1. GET /api/leaderboard/[tournamentId]
2. POST /api/scores
3. POST /api/validate-code

Enables Frontend ↔ Backend integration testing without ambiguity.

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 10

## Acceptance Criteria
- [ ] Document created: `docs/api-contract.md`
- [ ] Endpoint 1: GET /api/leaderboard/[id]
  - [ ] Request parameters documented
  - [ ] Response schema (JSON) with examples
  - [ ] Status codes: 200, 404, 500
  - [ ] Cache headers documented (Cache-Control)
  - [ ] Timing expectations (p50, p95, p99 latency)
- [ ] Endpoint 2: POST /api/scores
  - [ ] Request body schema (tournament_id, player_id, hole_id, strokes, updated_at)
  - [ ] Response schema (success: true, score_id OR error message)
  - [ ] Status codes: 201, 400, 401, 403, 422, 500
  - [ ] Conflict resolution explained (newer timestamp wins)
  - [ ] Offline-sync behavior documented
- [ ] Endpoint 3: POST /api/validate-code
  - [ ] Request: { code: string }
  - [ ] Response: { tournament_id, expires_at } OR { error }
  - [ ] Status codes: 200, 400, 401, 429, 500
  - [ ] Rate limiting: 5 failures / 5min per IP → 429 response
- [ ] Error codes documentation
  - [ ] 400 Bad Request (invalid JSON, missing fields)
  - [ ] 401 Unauthorized (invalid token, expired code)
  - [ ] 403 Forbidden (recorder accessing wrong tournament)
  - [ ] 404 Not Found (tournament doesn't exist)
  - [ ] 422 Unprocessable Entity (invalid score value)
  - [ ] 429 Too Many Requests (rate limit)
  - [ ] 500 Internal Server Error (database error)
- [ ] Each error includes: error code, human-readable message, suggestion
- [ ] Examples: curl, JavaScript fetch(), TypeScript usage
- [ ] Deployment notes: Vercel API routes vs Cloudflare Workers (defer pooling)

## Documentation Structure
```markdown
# API Contract — OpenTour MVP

## Endpoints Overview
- GET /api/leaderboard/[tournamentId]
- POST /api/scores
- POST /api/validate-code

## 1. GET /api/leaderboard/[tournamentId]

### Request
```

### Files to Create/Modify
- [ ] `docs/api-contract.md` (NEW)
- [ ] `docs/api-examples/` directory (NEW) — example code snippets

## Estimated Time
4-6 hours

## Owner
@full-stack / @docs-lead

## Related
- Blocks: All integration testing
- Dependencies: Endpoints must exist (issues #201-#205, #301-#304)
```

### Issue #301: [BLK] Implement ladder seeding algorithm + challenge flow

```markdown
---
name: Blocker #301
title: "[BLK] Implement ladder seeding algorithm + challenge flow"
labels: type:feature, priority:blocker, area:backend
---

## Description
Ladder competitions require:
1. Initial seeding (issue #103)
2. Challenge flow: player A challenges B → play match → promote/demote
3. Match result scoring and rung updates

This issue covers challenge flow backend (API endpoints + database logic).

**Design reference:** `docs/golf-app-design-document-v03-definitief.md` § 7.2

## Acceptance Criteria
- [ ] Table: `ladder_challenges` created with:
  - id, tournament_id, challenger_id, challenger_rung, opponent_id, opponent_rung
  - status (pending, accepted, declined, played, forfeited)
  - created_at, expires_at (24hr window)
- [ ] API endpoint: POST /api/ladder/challenge (create challenge)
  - Request: { tournament_id, opponent_id, ladder_id }
  - Validation: challenger.rung == opponent.rung - 1 (can only challenge up)
  - Response: { challenge_id, expires_at }
- [ ] API endpoint: POST /api/ladder/challenge/:id/respond (accept/decline)
  - Request: { action: 'accept' | 'decline' }
  - If decline: challenge expires, opponent stays
  - If accept: challenge transitions to 'accepted', match can be scored
- [ ] API endpoint: POST /api/ladder/challenge/:id/result (score match)
  - Request: { winner_id, result_type: 'played' | 'forfeit' }
  - Logic: update matchplay_pairings score + calculate rung changes
  - Promote winner to winner's rung; demote loser or keep at loser's rung
  - Cascade: if rung was occupied, displace existing player (move down)
- [ ] RLS policy: Ladder challenge visible to: tournament organizer, both players
- [ ] Notifications: Send to opponent on new challenge (optional, post-MVP)
- [ ] Test: Full ladder challenge → accept → score → verify rung changes
- [ ] Test: Decline challenge → both stay in same rung
- [ ] Test: Cascade demotion (3 players in rung, 2 play, winner gets bumped up)
- [ ] Error handling: Expired challenges, invalid rung positions, already playing

## Files to Create/Modify
- [ ] `supabase/migrations/20260XXX_ladder_challenges.sql` (NEW)
- [ ] `apps/web/app/api/ladder/challenge/route.ts` (NEW)
- [ ] `apps/web/app/api/ladder/challenge/[id]/respond/route.ts` (NEW)
- [ ] `apps/web/app/api/ladder/challenge/[id]/result/route.ts` (NEW)
- [ ] `apps/web/__tests__/ladder-flow.test.ts` (NEW)

## Estimated Time
6-8 hours

## Owner
@backend-specialist

## Related
- Depends on: #103 (seeding), #102 (RLS)
- Blocks: #305, #306 (ladder UI, challenge UI)
```

---

## 🔗 GitHub Project Board Setup

### Create columns:

1. **Backlog** — Unassigned, not yet started
2. **Ready** — Assigned, dependencies met, ready to work
3. **In Progress** — Actively being developed
4. **In Review** — PR submitted, awaiting code review
5. **Done** — Merged to main

### Automation:

- When issue is assigned → move to "Ready"
- When PR linked → move to "In Review"
- When PR merged → move to "Done"

### Sprint planning:

- **Week 1:** Blockers #101-105 (Database & RLS)
- **Week 2:** Blockers #201-207 (PWA Sync), #301-304 (Matchplay), #501 (API Contract)
- **Week 3:** Blockers #401-407 (Course Redesign), load testing
- **Week 4:** Testing & launch prep

---

## 💡 Key Points for Jean-Paul

1. **Issues ARE the unit of work** — not just for bugs. Each issue → 1 PR.

2. **Labels keep things organized** — filter by `priority:blocker` to see MVP blockers only.

3. **GitHub Project = visual roadmap** — drag issues through columns as they progress.

4. **Parallel work enabled** — Week 1 has 5 blockers; can assign to 3+ people simultaneously.

5. **Dependencies visible** — issue links show what blocks what (e.g., #101 blocks #202).

6. **PR = closure** — each merged PR closes 1-2 related issues (use `Closes #123` in PR description).

7. **Matchplay NOW in scope** — #103, #301-308 are dedicated to ladder; ~2-3 weeks total work.

8. **API contract created early** — #501 in Week 2 ensures frontend/backend don't diverge.

---

**Ready to create the GitHub project board and start issue assignments?**
