# OpenTour MVP — GitHub Issues Checklist (Kant-en-klaar)

Kopieeer deze issues direct in GitHub (Settings → Project). Labels en templates moet je eerst aanmaken.

---

## 🏷️ STAP 1: GitHub Labels aanmaken

Ga naar: GitHub repo → Settings → Labels → New Label

```
Type Labels:
  - type:feature    (color: #0075ca, description: "New feature implementation")
  - type:bug        (color: #d73a49, description: "Bug fix")
  - type:docs       (color: #0366d6, description: "Documentation")
  - type:refactor   (color: #fbca04, description: "Code quality / tech debt")
  - type:test       (color: #1d76db, description: "Testing")

Priority Labels:
  - priority:blocker  (color: #a4003f, description: "Must have for MVP")
  - priority:high     (color: #d73a49, description: "Should have in MVP")
  - priority:medium   (color: #fbca04, description: "Nice to have")
  - priority:low      (color: #cccccc, description: "Can defer")

Area Labels:
  - area:database     (color: #5319e7, description: "Migrations, schema, SQL")
  - area:backend      (color: #0366d6, description: "API routes, business logic")
  - area:frontend     (color: #1d76db, description: "UI, components, React")
  - area:pwa          (color: #1f883d, description: "Offline, Service Worker")
  - area:security     (color: #a4003f, description: "RLS, auth, CORS")
  - area:docs         (color: #0366d6, description: "Documentation")

Status Labels (optional, for project automation):
  - status:ready      (color: #e2e5ea, description: "Ready to work on")
  - status:blocked    (color: #ffcccc, description: "Waiting on something")
```

---

## 📋 STAP 2: GitHub Issues aanmaken

Hiervoor kun je GitHub API gebruiken of copy-paste in de UI. Hier is de kant-en-klare lijst:

### WEEK 1 — DATABASE & SECURITY

#### Issue #101
**Title:** `[BLK] Implement upsert_score_if_newer() Postgres function`  
**Labels:** `type:feature`, `priority:blocker`, `area:database`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
Offline sync requires conflict resolution. When two recorders enter the same score,
the one with the newer `updated_at` should win.

## Acceptance Criteria
- [ ] Function `upsert_score_if_newer()` created in Postgres
- [ ] Accepts: tournament_id, player_id, hole_id, round_number, strokes, updated_at
- [ ] Returns: score_id, was_updated (boolean)
- [ ] Dry-run tested against staging (3 test cases)
- [ ] Unit test: newer timestamp overwrites older
- [ ] Unit test: older timestamp doesn't overwrite newer
- [ ] Unit test: insert new score if not exists
- [ ] Migration: `supabase/migrations/20260XXX_upsert_score_if_newer.sql`

## Files to create/modify
- [ ] `supabase/migrations/20260XXX_upsert_score_if_newer.sql` (NEW)
- [ ] `apps/web/__tests__/upsert-score.test.ts` (NEW)
- [ ] `apps/web/hooks/useScoreSync.ts` (UPDATE)

## Reference
See: OPENTOUR_TECHNISCH_IMPLEMENTATIE.md § Blocker 1

## Estimated time
2-4 hours
```

#### Issue #102
**Title:** `[BLK] Audit & fix RLS policies — recorder scope security`  
**Labels:** `type:test`, `priority:blocker`, `area:security`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
RLS policies incomplete. Recorder might access other tournaments' scores.
Need security audit + fix.

## Acceptance Criteria
- [ ] Audit: Extract all pg_policies from Supabase
- [ ] Fix: Implement `is_recorder_for_tournament()` helper
- [ ] Recorder scope: now limited to single tournament per access_code
- [ ] Create pg-tap unit tests (5 test cases)
- [ ] Test: Organizer can insert own tournament's scores ✓
- [ ] Test: Recorder with valid code inserts for that tournament ✓
- [ ] Test: Recorder without code cannot insert ✗
- [ ] Test: Public leaderboard readable without auth ✓
- [ ] Test: Draft tournaments invisible to unauthorized ✗
- [ ] Manual verification: checklist completed
- [ ] Migration: `supabase/migrations/20260XXX_fix_recorder_rls.sql`

## Files to create/modify
- [ ] `supabase/migrations/20260XXX_fix_recorder_rls.sql` (NEW)
- [ ] `supabase/tests/rls_policies.sql` (NEW)
- [ ] `docs/security.md` (NEW or UPDATE)
- [ ] `apps/web/app/api/auth/code-login/route.ts` (UPDATE)

## Reference
See: OPENTOUR_TECHNISCH_IMPLEMENTATIE.md § Blocker 2

## Estimated time
6-8 hours
```

#### Issue #103
**Title:** `[BLK] Implement ladder seeding — 3 algorithms`  
**Labels:** `type:feature`, `priority:blocker`, `area:database`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
Ladder competition seeding algorithm. Support random, handicap ascending, 
handicap descending methods.

## Acceptance Criteria
- [ ] Seeding algorithm: Random (Fisher-Yates)
- [ ] Seeding algorithm: Handicap ascending
- [ ] Seeding algorithm: Handicap descending
- [ ] Function: `ladder_seed_rungs(tournament_id, seeding_method)`
- [ ] Handles ties in handicap correctly
- [ ] Pyramid rung growth: double & linear support
- [ ] Dry-run: 8-player ladder seeding
- [ ] Dry-run: 12-player ladder seeding
- [ ] Unit test: verify rung distribution
- [ ] Migration: `supabase/migrations/20260XXX_ladder_seeding.sql`

## Files to create/modify
- [ ] `supabase/migrations/20260XXX_ladder_seeding.sql` (NEW)
- [ ] `apps/web/lib/ladder-seeding.ts` (NEW)
- [ ] `apps/web/__tests__/ladder-seeding.test.ts` (NEW)

## Related issues
- Depends on: #102 (RLS context)
- Blocks: #302, #305 (challenge flow, ladder UI)

## Estimated time
4-6 hours
```

#### Issue #104
**Title:** `Dry-run all migrations — staging database validation`  
**Labels:** `type:test`, `priority:high`, `area:database`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
Validate all 23+ existing migrations work correctly against staging database.

## Acceptance Criteria
- [ ] Run: `supabase db push --db-url <staging-url>`
- [ ] All migrations applied without error
- [ ] Schema matches expected state
- [ ] No data loss in test data
- [ ] Indexes created successfully
- [ ] RLS policies active
- [ ] Views work correctly

## Test queries
```sql
SELECT * FROM pg_migrations;
SELECT * FROM leaderboard_view WHERE tournament_id = '...';
SELECT COUNT(*) FROM holes;
```

## Estimated time
1-2 hours
```

#### Issue #105
**Title:** `Add pg-tap unit tests for RLS policies`  
**Labels:** `type:test`, `priority:blocker`, `area:security`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
Create automated pg-tap tests for RLS policies. Validates security on each deploy.

## Acceptance Criteria
- [ ] Test file: `supabase/tests/rls_policies.sql`
- [ ] Test 1: Organizer can insert scores for own tournament
- [ ] Test 2: Recorder with valid code inserts for tournament
- [ ] Test 3: Recorder without code blocked (403)
- [ ] Test 4: Public leaderboard readable (no auth)
- [ ] Test 5: Draft tournament hidden from unauthorized
- [ ] All tests pass: `pg_prove supabase/tests/rls_policies.sql`

## Estimated time
2-3 hours
```

---

### WEEK 2 — PWA OFFLINE SYNC

#### Issue #201
**Title:** `[BLK] Implement IndexedDB schema (Dexie.js)`  
**Labels:** `type:feature`, `priority:blocker`, `area:pwa`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
Local storage for pending scores before sync. Uses Dexie.js on top of IndexedDB.

## Acceptance Criteria
- [ ] Add `dexie@^4.0.0` to package.json
- [ ] Create: `apps/web/lib/db.ts`
- [ ] Table: `pending_scores` with full schema
- [ ] Table: `cached_tournaments`, `cached_flights`
- [ ] Indexes: tournament_id, synced status
- [ ] Transactions: atomic multi-row operations
- [ ] Type safety: TypeScript interfaces
- [ ] Test: insert → retrieve pending score
- [ ] Test: query by tournament_id
- [ ] Test: update synced status
- [ ] Test: cleanup old cached data

## Files
- [ ] `apps/web/lib/db.ts` (NEW)
- [ ] `apps/web/__tests__/db.test.ts` (NEW)
- [ ] `package.json` (UPDATE)

## Reference
See: OPENTOUR_TECHNISCH_IMPLEMENTATIE.md § Blocker 5

## Estimated time
2-3 hours
```

#### Issue #202
**Title:** `[BLK] Add navigator.onLine event — sync trigger`  
**Labels:** `type:feature`, `priority:blocker`, `area:pwa`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
When device regains network, sync pending scores via upsert_score_if_newer().

## Acceptance Criteria
- [ ] Hook: `useSyncOnlineStatus()`
- [ ] Listen: navigator.onLine event
- [ ] Fetch: all pending_scores where synced=false
- [ ] Call: upsert_score_if_newer() for each
- [ ] On success: mark synced=true
- [ ] On error: log sync_error
- [ ] Retry: exponential backoff (1s, 2s, 4s, 8s)
- [ ] Test: offline → online → sync triggered
- [ ] Test: 5 pending, 3 succeed, 2 fail → correct status
- [ ] Integration E2E test

## Files
- [ ] `apps/web/hooks/useSyncOnlineStatus.ts` (NEW)
- [ ] `apps/web/lib/sync.ts` (NEW)
- [ ] `apps/web/__tests__/sync.test.ts` (NEW)

## Depends on
- #101 (upsert function exists)
- #201 (IndexedDB exists)

## Estimated time
3-4 hours
```

#### Issue #203
**Title:** `[BLK] Configure Service Worker (next-pwa)`  
**Labels:** `type:feature`, `priority:blocker`, `area:pwa`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
Service Worker caches app shell for offline availability. Users can use scorer 
even if connection drops after first visit.

## Acceptance Criteria
- [ ] Install: `next-pwa@^5.0.0`
- [ ] Create: `public/manifest.json`
  - App name, icons (192x192, 512x512)
  - Start URL: `/scorer`
  - Theme color
- [ ] Update: `next.config.js` with PWA config
- [ ] Cache strategy: NetworkFirst for API, CacheFirst for assets
- [ ] Test: Install on iOS Safari 14.3+
- [ ] Test: Install on Android Chrome 8.0+
- [ ] Test: Go offline → app loads
- [ ] TypeScript: no errors

## Files
- [ ] `public/manifest.json` (NEW)
- [ ] `next.config.js` (UPDATE)
- [ ] `package.json` (UPDATE)

## Estimated time
2-3 hours
```

#### Issue #204
**Title:** `Build offline score submission flow (submitScore)`  
**Labels:** `type:feature`, `priority:blocker`, `area:frontend`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
Score submission: save locally offline, sync when online.

## Acceptance Criteria
- [ ] Function: `submitScore(scoreData)` in useScoreSync hook
- [ ] When offline: save to IndexedDB + show "📴 Offline"
- [ ] When online: call upsert_score_if_newer() RPC
- [ ] Optimistic UI: score visible immediately
- [ ] Sync badge: transitions through states
- [ ] Error handling: retry logic
- [ ] Test: offline submit → reconnect → sync

## Files
- [ ] `apps/web/hooks/useScoreSync.ts` (UPDATE)
- [ ] `apps/web/__tests__/offline-submit.test.ts` (NEW)

## Depends on
- #101, #201, #202 (all sync components)

## Estimated time
2-3 hours
```

#### Issue #205
**Title:** `Add sync status badges (UI indicators)`  
**Labels:** `type:feature`, `priority:high`, `area:frontend`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
Visual indicators for sync state: online/offline/syncing/error.

## Acceptance Criteria
- [ ] Badge: "✅ Gesynchroniseerd" (green, online + synced)
- [ ] Badge: "🔄 Synchroniseren..." (orange, syncing)
- [ ] Badge: "📴 Offline — scores bewaard" (yellow, offline)
- [ ] Badge: "❌ Sync error — probeer opnieuw" (red, sync failed)
- [ ] Component: `SyncStatusBadge.tsx`
- [ ] Responsive: visible on mobile/tablet
- [ ] Clear messaging: user knows what's happening

## Files
- [ ] `apps/web/components/SyncStatusBadge.tsx` (NEW)
- [ ] `apps/web/app/[locale]/scorer/page.tsx` (UPDATE)

## Estimated time
1-2 hours
```

#### Issue #206
**Title:** `Test PWA offline on real devices`  
**Labels:** `type:test`, `priority:blocker`, `area:pwa`  
**Assignee:** @qa-tester  
**Body:**
```
## Description
Manual testing on iOS Safari 14.3+ and Android Chrome 8.0+.

## Acceptance Criteria
- [ ] iPhone (iOS 14.3+): PWA installable
- [ ] iPhone: Offline scorer works
- [ ] iPhone: Can enter scores offline
- [ ] iPhone: Scores sync when reconnected
- [ ] Android (8.0+): PWA installable
- [ ] Android: Offline scorer works
- [ ] Android: Score sync works
- [ ] No errors in browser console
- [ ] Performance: <3s app launch

## Test plan
1. Install PWA ("Add to Home Screen")
2. Go offline (Airplane mode or DevTools)
3. Open app → loads from cache
4. Enter score for hole 1
5. Reconnect
6. Verify: score appears in leaderboard

## Estimated time
2-3 hours
```

#### Issue #207
**Title:** `E2E test: offline score → reconnect → sync → leaderboard`  
**Labels:** `type:test`, `priority:blocker`, `area:pwa`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
End-to-end integration test simulating full offline workflow.

## Acceptance Criteria
- [ ] Scenario 1: Offline score appears in local UI
- [ ] Scenario 2: Reconnect triggers sync
- [ ] Scenario 3: Score appears in leaderboard after sync
- [ ] Scenario 4: Multiple pending scores sync in correct order
- [ ] Scenario 5: Sync error handled gracefully
- [ ] Playwright test written + passing

## Test code
```typescript
// apps/web/__tests__/e2e/offline-score-sync.spec.ts
test('offline score syncs to leaderboard', async ({ browser }) => {
  // 1. Go offline
  // 2. Enter score
  // 3. Verify: appears locally
  // 4. Go online
  // 5. Verify: syncs
  // 6. Verify: leaderboard updated
});
```

## Estimated time
3-4 hours
```

---

### WEEK 2 — MATCHPLAY & LADDER

#### Issue #301
**Title:** `[BLK] Implement ladder challenge flow (backend)`  
**Labels:** `type:feature`, `priority:blocker`, `area:backend`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
Ladder challenge system: challenger picks opponent, accepts/declines, play match,
update rungs.

## Acceptance Criteria
- [ ] Table: `ladder_challenges` created
- [ ] Endpoint: POST /api/ladder/challenge (create)
- [ ] Endpoint: POST /api/ladder/challenge/:id/respond (accept/decline)
- [ ] Endpoint: POST /api/ladder/challenge/:id/result (score match)
- [ ] Validation: challenger.rung == opponent.rung - 1
- [ ] Cascade demotion: correct rung shuffling
- [ ] RLS: organizer + both players can see
- [ ] Test: full challenge → accept → score → verify rungs
- [ ] Test: decline challenge → both stay
- [ ] Test: cascade demotion (3 players, 2 play)
- [ ] Migration: `supabase/migrations/20260XXX_ladder_challenges.sql`

## Files
- [ ] `supabase/migrations/20260XXX_ladder_challenges.sql` (NEW)
- [ ] `apps/web/app/api/ladder/challenge/route.ts` (NEW)
- [ ] `apps/web/app/api/ladder/challenge/[id]/respond/route.ts` (NEW)
- [ ] `apps/web/app/api/ladder/challenge/[id]/result/route.ts` (NEW)
- [ ] `apps/web/__tests__/ladder-flow.test.ts` (NEW)

## Depends on
- #103 (seeding), #102 (RLS)

## Related
- Blocks: #305, #306 (ladder UI)

## Estimated time
6-8 hours
```

#### Issue #302-308
(Similar structure — focus on UI for ladder board, challenge notifications, etc.)

---

### WEEK 2 — API DOCUMENTATION

#### Issue #501
**Title:** `[BLK] Create API contract — all endpoints`  
**Labels:** `type:docs`, `priority:blocker`, `area:backend`  
**Assignee:** @backend-specialist  
**Body:**
```
## Description
Formal API contract for all MVP endpoints. Enables Frontend/Backend independent work.

## Endpoints to document
1. GET /api/leaderboard/[tournamentId]
2. POST /api/scores
3. POST /api/validate-code

## Acceptance Criteria
- [ ] Document: `docs/api-contract.md` created
- [ ] Endpoint 1: Request, response, examples, status codes
- [ ] Endpoint 2: Request, response, examples, error handling
- [ ] Endpoint 3: Rate limiting (5/5min per IP), responses
- [ ] Error codes: 400, 401, 403, 404, 422, 429, 500
- [ ] Examples: curl, JavaScript fetch(), TypeScript
- [ ] Deployment notes: Vercel vs Cloudflare choices

## Files
- [ ] `docs/api-contract.md` (NEW)
- [ ] `docs/api-examples/` (NEW directory with code samples)

## Reference
See: GITHUB_WORKFLOW_ISSUES.md for template

## Estimated time
4-6 hours
```

---

### WEEK 3 — COURSE REDESIGN

#### Issue #401-407
**Title:** `[BLK] Course management 4-tab layout + tabs 1-4 implementation`  
**Labels:** `type:feature`, `priority:high`, `area:frontend`  
**Assignee:** @frontend-specialist  
**Body:**
```
## Description
Redesign /course/[id] page: from single sprawling form to 4-tab interface
(Algemeen | Tees | Holes | Lussen).

## Acceptance Criteria
- [ ] Tab 1 (Algemeen): name, location, country, holes_count (readonly)
- [ ] Tab 2 (Tees): CRUD tees, add ratings (slope/course)
- [ ] Tab 3 (Holes): per-tee distance/par overrides, stroke_index required
- [ ] Tab 4 (Lussen): loop definitions, hole assignments
- [ ] Form validation: complete
- [ ] Responsive: mobile/tablet/desktop
- [ ] Save states: form dirty tracking
- [ ] Test: all CRUD operations per tab

## Files
- [ ] `apps/web/app/[locale]/course/[id]/page.tsx` (REFACTOR)
- [ ] `apps/web/components/CourseEditTabs/` (NEW directory)
  - `Algemeen.tsx`, `Tees.tsx`, `Holes.tsx`, `Lussen.tsx`
- [ ] `apps/web/__tests__/course-management.test.ts` (NEW)

## Related
- Partially done (design tokens ✓, components ⚠️)

## Estimated time
6-8 hours
```

---

### WEEK 4 — TESTING & LAUNCH

#### Issue #601-610
**Title:** `[BLK] End-to-end test, load testing, security audit, pilot`  
**Labels:** `type:test`, `priority:blocker`, `area:frontend`  
**Assignee:** @qa-lead  
**Body:**
```
## Description
Final MVP validation before launch.

## Acceptance Criteria
- [ ] E2E: organizer → recorder → spectator flow works
- [ ] Load test: 1000 concurrent leaderboard pollers
- [ ] Security audit: RLS, CORS, CSP headers
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Manual: real golf club pilot (20-30 players, full toernooi)
- [ ] Performance: Lighthouse >80 score
- [ ] Fix: all critical bugs from pilot

## Test scenarios
1. Organizer creates toernooi
2. Recorder enters scores offline
3. Spectator views live leaderboard
4. All devices + browsers work

## Estimated time
3-4 days
```

---

## 🚀 GitHub Project Setup

### Create project: "OpenTour MVP"

**Columns:**
1. Backlog (new issues)
2. Ready (assigned, dependencies met)
3. In Progress (actively worked)
4. In Review (PR submitted)
5. Done (merged)

**Add issues to columns based on status.**

---

## 📅 Week-by-week assignments

### WEEK 1
- Person A: #101, #104 (database upsert + migrations)
- Person B: #102, #105 (RLS security audit + tests)
- Person C: #103 (ladder seeding)

### WEEK 2
- Person A: #201, #202, #203 (PWA infrastructure)
- Person B: #204, #205, #206, #207 (offline score + testing)
- Person C: #301-308 (ladder backend)
- Person D: #501 (API contract docs)

### WEEK 3
- Person A: #401-407 (course redesign)
- Person B: Load testing (#601)
- Person C: Matchplay UI (#305-308)

### WEEK 4
- Everyone: #601-610 (testing, pilot, launch)

---

## ✅ Hoe te gebruiken

1. **Copy-paste issues in GitHub UI** (New Issue → paste body)
2. **Assign to team members**
3. **Move through columns** as work progresses
4. **Link PRs** to issues (in PR description: `Closes #101`)
5. **Track progress** via project board (100+ issues = full visibility)

---

**Ready? Start with Week 1 blockers. Assign them today.**
