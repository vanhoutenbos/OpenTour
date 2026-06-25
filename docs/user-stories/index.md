# OpenTour — User Stories

> **Status:** In ontwikkeling  
> **Doel:** Gestructureerd overzicht van alle user stories, geordend per epic.  
> **Onderscheid MVP / Later / Premium** is bij elke story aangegeven.  

## Overzicht epics

| # | Epic | Doelgroep | MVP stories | Later stories | Premium stories |
|---|---|---|---|---|---|---|
| 01 | [Visie en scope](01-vision-and-scope.md) | Allen | 5 | 4 | 0 |
| 02 | [Organisator — toernooibeheer](02-organizer-flow.md) | Organisator | 12 | 11 | 0 |
| 03 | [Scorer — score invoeren](03-scorer-flow.md) | Recorder | 10 | 8 | 0 |
| 04 | [Toeschouwer — leaderboard](04-spectator-leaderboard.md) | Toeschouwer | 8 | 7 | 0 |
| 05 | [Authenticatie en toegang](05-authentication-and-access.md) | Organisator, recorder | 5 | 3 | 0 |
| 06 | [Privacy, AVG en exports](06-privacy-and-exports.md) | Allen | 7 | 5 | 2 |
| 07 | [Baandatabase en open data](07-course-database.md) | Organisator | 4 | 3 | 0 |
| 08 | [Premium en toekomst](08-premium-and-future.md) | Organisator, club | 0 | 0 | 7 |

**Totaal:** 51 MVP, 41 Later, 9 Premium = 101 stories

## Voortgang

**Huidige stand (MVP):** 0 🟢 Confirmed · 34 ✅ Done · 2 🔄 In Progress · 15 ⬜ To Do · 0 ⛔ Blocked = **67%**

| Epic | MVP | 🟢 | ✅ | 🔄 | ⬜ | % |
|---|---|---|---|---|---|---|
| Visie en scope | 5 | 0 | 4 | 1 | 0 | 80% |
| Organisator | 12 | 0 | 11 | 0 | 1 | 92% |
| Scorer | 10 | 0 | 7 | 1 | 2 | 70% |
| Spectator | 8 | 0 | 8 | 0 | 0 | 100% |
| Authenticatie | 5 | 0 | 4 | 0 | 1 | 80% |
| Privacy/AVG | 7 | 0 | 4 | 1 | 2 | 57% |
| Baandatabase | 4 | 0 | 4 | 0 | 0 | 100% |
| **Totaal** | **51** | **0** | **34** | **2** | **15** | **67%** |

> **Lifecycle:** ⬜ To Do → 🔄 In Progress → ✅ Done → 🟢 Confirmed  
> Status per individuele story staat in [`progress.json`](progress.json). Werk na elke implementatiesessie bij.

## Legenda

### Prioriteiten

| Label | Betekenis |
|---|---|
| **M** | Must have — MVP is niet volledig zonder deze story |
| **S** | Should have — sterk gewenst, maar geen blokkeerder |
| **C** | Could have — nice to have |
| **L** | Later — niet in MVP |

### Fases

| Fase | Betekenis |
|---|---|
| **MVP** | Wordt gebouwd in de MVP voor de De Haenen pilot |
| **Later** | Wordt pas na de pilot gebouwd (fase 2 of 3) |
| **Premium** | Wordt pas in fase 4 gebouwd, mogelijk betaald |

### Story structuur

Elke user story volgt deze vaste opmaak:

```markdown
### US-[nummer] — [korte titel]

- **Rol:** [wie]
- **Doel:** [wil ik ...]
- **Waarde:** [zodat ...]
- **Prioriteit:** [M/S/C/L]
- **Fase:** [MVP / Later / Premium]
- **Afhankelijk van:** [US-xxx, US-yyy]
- **Acceptatiecriteria:**
  - ...
- **Opmerkingen:**
  - ...
```

## Labels voor traceerbaarheid

Elke story heeft een uniek nummer per epic:

| Epic | Prefix |
|---|---|
| Visie en scope | VS- |
| Organisator | ORG- |
| Scorer | SCR- |
| Spectator | SPE- |
| Authenticatie | AUTH- |
| Privacy | PRI- |
| Baandatabase | CRS- |
| Premium | PRM- |

---

*Dit is een levend document. Stories worden toegevoegd, bijgewerkt of gesloten op basis van productbeslissingen en feedback uit de pilot.*
