# GitHub voor OpenTour — Praktische Uitleg

**TL;DR:**
- ✅ **Issues = alles.** Bugs, features, docs, chores, tech debt.
- ✅ **Project = visuele kanban.** Issues worden kaarten in kolommen.
- ✅ **PR = implementatie.** Sluit 1+ issues als "Closes #123".
- ✅ **Je huidge workflow:** Prima, just formaliseren naar GitHub Issues.

---

## ❌ Misverstanding #1: "Issues zijn alleen voor bugs"

**ONWAAR.** Issue label "bug" is maar één type.

GitHub issues kunnen zijn:
- 🐛 **bug** — iets is kapot
- ✨ **feature** — nieuwe functionaliteit
- 📝 **docs** — documentatie schrijven
- 🔧 **refactor** — code quality/tech debt
- 🧪 **test** — test coverage toevoegen
- 🎨 **chore** — maintenance (dependencies, config)
- ⚡ **performance** — optimization

**Jij gebruikt al issue-achtige dingen:**
```
- "Implementeer upsert_score_if_newer() function"
- "Schrijf API contract"
- "Fix RLS recorder scope"
- "Course redesign 4-tab layout"
```

Dit zijn **allemaal GitHub Issues**, alleen niet geformaliseerd in GitHub.

---

## ✅ Je huidge workflow (deels informeel)

```
Jean-Paul's mind:
  ├─ "Offline sync needs 6 things"
  ├─ "Matchplay is complex, split into 8 parts"
  ├─ "Security audit needs investigation"
  └─ "API contract must be documented"

Huidge documentatie:
  ├─ GITHUB_ISSUES_KANT_EN_KLAAR.md (50+ beschrijvingen)
  ├─ PRIORITEIT_MATRIX.md (roadmap)
  └─ ANALYSE_AUGUSTUS_2026.md (context)

Huidge GitHub:
  ├─ PR's linked to features (sometimes)
  ├─ Commits mention issues (sometimes)
  └─ No formal issue tracking (Project board empty?)
```

**Problem:** Werk is verspreid over docs + commits + PR's. Geen centraal dashboard.

---

## ✅ Formele workflow (wat je wil)

```
GitHub Project: "OpenTour MVP"
├─ Backlog
│  ├─ Issue #101: [BLK] Implement upsert_score_if_newer()
│  ├─ Issue #102: [BLK] Audit & fix RLS policies
│  ├─ Issue #201: [BLK] Implement IndexedDB schema
│  └─ ... 50+ total
├─ Ready
│  ├─ Issue #101 → assigned to @backend-dev
│  ├─ Issue #102 → assigned to @backend-dev
│  └─ (dependencies met, ready to start)
├─ In Progress
│  ├─ Issue #101 (dev working on it now)
│  └─ Issue #104 (migration testing)
├─ In Review
│  ├─ PR #456 → Closes #101, #102, #104 (3 issues in 1 PR)
│  └─ (awaiting code review)
└─ Done
   ├─ Issue #101 ✅ (merged)
   ├─ Issue #102 ✅ (merged)
   └─ Issue #104 ✅ (merged)
```

**Voordeel:** Alles op één plek. Geen docs meer raadplegen. Dashboard = source of truth.

---

## 🏗️ Structuur: Project vs Issues vs PR's

### 1. GitHub Project Board ("OpenTour MVP")

**Wat?** Kanban board in GitHub.

**Kolommen:**
```
Backlog → Ready → In Progress → In Review → Done
```

**Kaarten?** GitHub Issues (die je maakt).

**Hoe instellen:**
1. Repo → Projects tab
2. "New project"
3. Select "Table" view (easier than Kanban for this)
4. Create columns (above)
5. Add issues to project (automatic when labeled)

---

### 2. GitHub Issues

**Wat?** Individuele work items.

**Voorbeelden:**

```markdown
# Issue #101: [BLK] Implement upsert_score_if_newer()

## Description
Offline sync needs conflict resolution. Newer timestamp wins.

## Acceptance Criteria
- [ ] Function created
- [ ] Tested against staging
- [ ] PR merged

## Labels
- type:feature
- priority:blocker
- area:database

## Assigned to
@backend-dev

## Related
- Blocks: #202 (offline sync), #204 (full flow)
- Depends on: none
```

**Issue = een keer werk. Sluit met PR.**

---

### 3. Pull Requests

**Wat?** Code changes die issues sluiten.

**Voorbeeld PR:**

```markdown
# PR #456: Implement offline sync infrastructure

## Closes
- Closes #101 (upsert function)
- Closes #102 (RLS audit)
- Closes #104 (migration validation)
- Closes #105 (RLS tests)

## Changes
- Added `supabase/migrations/20260XXX_upsert_score_if_newer.sql`
- Added unit tests `apps/web/__tests__/upsert-score.test.ts`
- Updated `apps/web/hooks/useScoreSync.ts`
- Added migration validation tests

## How to test
```bash
npm run test
npm run typecheck
```

## Screenshot / Demo
(if applicable)
```

**PR sluiten = automatisch issues sluiten.**

---

## 🔄 De workflow in praktijk

### Week 1: Upsert function issue

**Maandag:**
1. Issue #101 is in "Backlog" (gemaakt vorige week)
2. Assign to @backend-dev
3. Move to "Ready"

**Dinsdag-woensdag:**
1. Dev klikt "Ready" → "In Progress" 
2. Dev maakt feature branch: `git checkout -b feature/upsert-function`
3. Dev schrijft SQL + tests

**Donderdag:**
1. Dev pushes naar GitHub
2. Dev opent PR #456
3. In PR description: "Closes #101"
4. Code review (Jean-Paul, andere dev, etc.)

**Vrijdag:**
1. Review approved
2. Dev merges PR → `git merge --squash feature/upsert-function`
3. **Automatisch:** Issue #101 closed, moved to "Done"

---

## 📊 GitHub Project Setup (exact stappen)

### Stap 1: Create Project

```
GitHub repo → "Projects" tab (top nav)
  → "New project" button
  → Template: "Table" (easier than Kanban)
  → Name: "OpenTour MVP"
  → Description: "MVP launch tracker"
```

### Stap 2: Add Columns

In the project table:
```
Column 1: Backlog    (new issues, not yet assigned)
Column 2: Ready      (assigned, dependencies met)
Column 3: In Progress (actively being worked)
Column 4: In Review   (PR submitted)
Column 5: Done        (merged)
```

### Stap 3: Add Fields (optional, but useful)

```
Field 1: Priority (dropdown: blocker, high, medium, low)
Field 2: Estimate (number: hours)
Field 3: Owner (single select: backend-dev, frontend-dev, qa)
Field 4: Sprint (dropdown: Week 1, Week 2, Week 3, Week 4)
```

### Stap 4: Create Issues

Via GitHub UI or CLI:
```bash
gh issue create \
  --title "[BLK] Implement upsert_score_if_newer()" \
  --body "..." \
  --label "type:feature,priority:blocker,area:database"
```

Or just copy-paste from `GITHUB_ISSUES_KANT_EN_KLAAR.md` via web UI.

### Stap 5: Add to Project

Issues automatically appear in "Backlog" column when created.

---

## 🔗 Automatisering (optioneel, maar handig)

### GitHub Actions: Auto-move on assignment

Create `.github/workflows/project-automation.yml`:

```yaml
name: Move issue to Ready when assigned

on:
  issues:
    types: [assigned]

jobs:
  move-to-ready:
    runs-on: ubuntu-latest
    steps:
      - uses: github/gh-cli
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - run: |
          gh project item-add $PROJECT_ID --id $ISSUE_ID
          gh project item-edit $PROJECT_ID --id $ITEM_ID --field-value "Ready"
```

**Effect:** Assign issue → automatically moved to "Ready" column.

(Optional. Kan ook handmatig doen.)

### Auto-close on PR merge

In PR template (`.github/pull_request_template.md`):

```markdown
## Closes
- Closes #101
- Closes #102

(GitHub auto-closes when PR merges)
```

---

## 📝 Label Taxonomy (copy-paste)

Create these labels in GitHub repo settings:

```
Type:
  - type:feature (blue)
  - type:bug (red)
  - type:docs (gray)
  - type:refactor (yellow)
  - type:test (green)

Priority:
  - priority:blocker (dark red)
  - priority:high (orange)
  - priority:medium (yellow)
  - priority:low (gray)

Area:
  - area:database (purple)
  - area:backend (blue)
  - area:frontend (green)
  - area:pwa (teal)
  - area:security (red)
  - area:docs (gray)
```

---

## 🎯 Concrete example: Week 1

### Monday morning

```
GitHub Project "OpenTour MVP"
┌──────────────────────────────────────────┐
│  Backlog (5)                             │
├──────────────────────────────────────────┤
│  #101 [BLK] Upsert function              │
│  #102 [BLK] RLS audit                    │
│  #103 [BLK] Ladder seeding               │
│  #104 Dry-run migrations                 │
│  #105 Add pg-tap tests                   │
└──────────────────────────────────────────┘

Ready (0)    In Progress (0)    In Review (0)    Done (0)
```

Jean-Paul: "Assign #101-105 to @backend-dev for Week 1"

### Monday afternoon

```
GitHub Project "OpenTour MVP"
┌──────────────────────────────────────────┐
│  Ready (5)                               │
├──────────────────────────────────────────┤
│  #101 [BLK] Upsert function @backend-dev │
│  #102 [BLK] RLS audit @backend-dev       │
│  #103 [BLK] Ladder seeding @backend-dev  │
│  #104 Dry-run migrations @backend-dev    │
│  #105 Add pg-tap tests @backend-dev      │
└──────────────────────────────────────────┘

Backlog (0)    In Progress (0)    In Review (0)    Done (0)
```

Dev @backend-dev: "Starting #101"

### Tuesday-Wednesday

```
In Progress (1)
│  #101 [BLK] Upsert function (in progress...)

Ready (4)
│  #102, #103, #104, #105 (waiting)
```

Dev working on it. Commits reference issue:
```bash
git commit -m "feat: implement upsert_score_if_newer() function (#101)"
```

### Thursday

```
In Review (1)
│  PR #456: Closes #101, #102, #104, #105

Ready (1)
│  #103 (still waiting on upsert to test seeding)
```

PR submitted. Code review ongoing.

### Friday

```
Done (4)
│  #101 ✅ Upsert function
│  #102 ✅ RLS audit (same PR)
│  #104 ✅ Dry-run migrations (same PR)
│  #105 ✅ pg-tap tests (same PR)

Ready (1)
│  #103 (now unblocked, ready to work)
```

PR merged. Issues auto-closed. Next issue ready.

---

## 🚀 Migration plan: Docs → GitHub Issues

**Huidge:** 50+ issues in `GITHUB_ISSUES_KANT_EN_KLAAR.md`

**Week 1 plan:**
1. **Monday 09:00** — Create GitHub Project + labels (1h)
2. **Monday 10:00** — Copy issues into GitHub (2h)
   - Open UI or use `gh issue create` CLI
   - Paste bodies from doc
   - Add labels + estimates + sprint
3. **Monday 12:00** — Verify all 50 issues in Project (30m)
4. **Monday 13:00** — Assign Week 1 blockers to devs (30m)
5. **Done** — GitHub Project = single source of truth

**After Monday:**
- All work tracked in GitHub
- No need to reference docs (docs are for reference only)
- PR's close issues automatically
- Dashboard always current

---

## ❓ FAQ

**Q: Moet ik issues in GitHub maken, of kan ik ze in docs houden?**  
A: **GitHub** = source of truth. Docs = historical reference. GitHub Project is wat mensen kijken voor "wat moet er gedaan worden?"

**Q: 1 PR per issue, of kan 1 PR meerdere issues sluiten?**  
A: **Beide!** 
- Ideal: 1 PR = 1 issue (small, reviewable)
- Praktijk: 1 PR = 3-4 related issues (PR #456 sloot #101-105)
- Use: `Closes #101, #102, #103` in PR description

**Q: Wat als iemand vergeet de issue in GitHub te checken?**  
A: Huidge: geen discipline. Later: kanban board wordt ge-checkt. Maak het naar gewoonte.

**Q: Hoe track ik blockers en dependencies?**  
A: Issues linking:
```markdown
## Related
- Blocks: #202, #204 (issues this blocks)
- Depends on: #101 (issue this depends on)
- Duplicate of: (if applicable)
```

GitHub shows links als "linked issues" bovenaan issue.

**Q: Kan ik issues als template gebruiken?**  
A: Ja! `.github/ISSUE_TEMPLATE/` folder + YAML frontmatter.

```
.github/ISSUE_TEMPLATE/
├─ feature.md
├─ bug.md
├─ blocker.md
└─ config.yml
```

**Q: Verwijder ik de docs dan?**  
A: **Nee.** Houd ze als:
- Historisch reference
- Knowledge base (design decisions)
- Onboarding (new team members)
- Maar GitHub Project = live status

---

## 📌 Your Workflow (Updated)

```
Old workflow:
  1. Write issue description in GITHUB_ISSUES_KANT_EN_KLAAR.md
  2. Assign to dev
  3. Dev works
  4. Dev makes PR
  5. (no tracking of progress)

New workflow:
  1. Copy issue description from doc → GitHub (Monday)
  2. Assign via GitHub project
  3. Dev moves issue through columns (Ready → In Progress → In Review)
  4. Dev makes PR → "Closes #123"
  5. Dashboard shows real-time progress (always current)
  6. GitHub = single source of truth
```

---

## ✅ TL;DR: Jouw vraag beantwoord

**"Werkt GitHub inderdaad zoals ik dacht?"**

Ja! Precies:

1. ✅ **Project maken** (`"OpenToor MVP"` kanban board)
2. ✅ **Items erin** (50+ GitHub issues)
3. ✅ **Issues voor álles** (not just bugs)
   - Features ✅
   - Docs ✅
   - Tech debt ✅
   - Tests ✅
   - Bugs ✅
4. ✅ **Werk tracken** via columns (Backlog → Ready → In Progress → Review → Done)
5. ✅ **PR's sluiten issues** (auto-close met `Closes #123`)

**Je huidge `GITHUB_ISSUES_KANT_EN_KLAAR.md`?**  
Perfect blueprint. Copy in GitHub Monday, use github project as dashboard.

---

**Ready om Monday GitHub setup te doen?** Laat mij weten als je vragen hebt!
