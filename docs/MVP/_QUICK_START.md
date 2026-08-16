# 🚀 OpenTour MVP — Quick Start Guide (5 minuten)

**Jij bent hier:** Wil weten wat te doen nu.  
**Resultaat na vandaag:** GitHub project opgezet, Week 1 werk assigned.

---

## ✅ Ja, je dacht goed

GitHub werkt **precies** zoals je verwachtte:

```
GitHub Project board (kanban)
  ├─ Issues = work items (features, bugs, docs, alles)
  ├─ Kolommen: Backlog → Ready → In Progress → Review → Done
  ├─ PR's sluiten issues automatisch ("Closes #123")
  └─ Dashboard = single source of truth
```

**Jouw GITHUB_ISSUES_KANT_EN_KLAAR.md?** Perfect. Copy-paste in GitHub Monday.

---

## 📋 3 Dingen weten (conclusie van alles)

### 1. Matchplay in MVP ✅
- Ladder competition is MVP feature (jij zei ja)
- Backend: #103 (seeding) + #301-308 (challenge flow)
- Frontend: #305-308 (ladder UI)
- ~8-10h werk backend, 6-8h frontend

### 2. Leaderboard caching = Vercel ✅
- Vercel Edge (native, gratis) for MVP
- Cloudflare (meer control) if load groeit (later)
- Implementatie: Week 2-3 als #501 (API contract)

### 3. Issues = alles ✅
- 50+ issues in `GITHUB_ISSUES_KANT_EN_KLAAR.md`
- Copy maandag → GitHub
- Assign Week 1 blockers (#101-105)
- Dashboard shows progress

---

## 📚 7 Documents ready (in `/outputs/`)

| # | Naam | Voor | Leestijd |
|---|------|------|----------|
| 00 | DOCUMENT_INDEX | Everyone | 2 min |
| 1 | EXECUTIVE_SUMMARY | Jij | 10 min |
| 2 | PRIORITEIT_MATRIX | Planner | 30 min |
| 3 | ANALYSE_AUGUST | Reference | 2h (skip) |
| 4 | TECHNISCH_IMPL | Developers | 2h (copy-paste) |
| 5 | GITHUB_WORKFLOW | GitHub setup | 30 min |
| 6 | GITHUB_ISSUES_KANT | Copy-paste | 1h (Monday) |
| 7 | VERCEL_VS_CF | Architecture | 20 min |
| 8 | GITHUB_PRAKTISCH | THIS FILE | 10 min |

---

## 🎯 Monday Checklist (4 hours)

### 09:00-10:00: GitHub Setup (1h)

- [ ] Create project: repo → Projects → "New project"
- [ ] Template: Table view
- [ ] Name: "OpenTour MVP"
- [ ] Create columns: Backlog, Ready, In Progress, Review, Done
- [ ] Add labels (repo Settings → Labels)
  - type:feature, type:bug, type:docs, type:refactor, type:test
  - priority:blocker, priority:high, priority:medium, priority:low
  - area:database, area:backend, area:frontend, area:pwa, area:security

**Done:** Project board + labels ready

### 10:00-12:00: Create Issues (2h)

- [ ] Open `GITHUB_ISSUES_KANT_EN_KLAAR.md`
- [ ] Copy-paste Issue #101 → GitHub
  - Title, body, labels, estimate, owner
- [ ] Copy-paste Issue #102-105
- [ ] Repeat for all 50+ issues (or do Week 1-2, rest later)

**Shortcut:** Use GitHub CLI
```bash
gh issue create \
  --title "[BLK] Implement upsert_score_if_newer()" \
  --body "$(cat issue-body.txt)" \
  --label "type:feature,priority:blocker,area:database"
```

**Done:** 50 issues in GitHub

### 12:00-13:00: Assign Week 1 (1h)

- [ ] Assign #101-105 to @backend-dev
- [ ] Move to "Ready" column
- [ ] Assign #201-207 to @frontend-dev (prep, not yet ready)
- [ ] Notify devs: "Check GitHub project, Week 1 blockers assigned"

**Done:** Team sees work, can start Monday

---

## 📅 This Week Timeline

| Day | Action | Time |
|-----|--------|------|
| **Mon** | GitHub setup + issues + assignments | 4h |
| **Tue** | Review blockers with team | 1h |
| **Wed** | Technical deep-dive (upsert, RLS, seeding) | 2h |
| **Thu** | Q&A + final decisions | 1h |
| **Fri** | Kickoff meeting, devs start Monday | 1h |

---

## 🚨 Top 6 Blockers (if you skim nothing else)

1. **Upsert function** (#101) — offline sync needs it
2. **RLS security** (#102) — recorder scope must be safe
3. **Ladder seeding** (#103) — matchplay algorithm
4. **PWA offline** (#201-207) — 10-14h work, Week 2
5. **Matchplay backend** (#301-304) — 6-8h work, Week 2
6. **API contract** (#501) — frontend/backend integration

All other work depends on these 6.

---

## ✅ Decision Made

- ✅ **Matchplay in MVP** (ladder competition)
- ✅ **Vercel Edge caching** (leaderboard)
- ✅ **API contract needed** (Week 2)
- ✅ **Issues = all work** (not just bugs)
- ✅ **4-week timeline** (realistic, no crunch)

---

## 🎬 Next Action

1. **Read:** EXECUTIVE_SUMMARY_ACTION_ITEMS.md (10 min)
2. **Monday 09:00:** GitHub project setup (4 hours)
3. **Done:** Team dashboard ready, work assigned

---

**Everything else is reference. GitHub project is what matters.**

Questions? Check GITHUB_PRAKTISCHE_UITLEG.md or ask Claude.

Ready? Go. 🚀
