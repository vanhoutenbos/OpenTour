# OpenTour — User Stories

> **Status:** In ontwikkeling
> **Doel:** Gestructureerd overzicht van alle user stories, geordend per epic.
> **Onderscheid MVP / Later / Premium** — en het bijbehorende **release-label 1.0 / Na 1.0** — is bij elke story aangegeven.
> **Laatst gesynchroniseerd met codebase:** 2026-07-08 (documentatie-audit, zie US-INFRA-12)

## Overzicht epics

| # | Epic | Doelgroep | MVP (1.0) stories | Later (Na 1.0) stories | Premium stories |
|---|---|---|---|---|---|
| 01 | [Visie en scope](01-vision-and-scope.md) | Allen | 8 | 1 | 0 |
| 02 | [Organisator — toernooibeheer](02-organizer-flow.md) | Organisator | 18 | 23 | 0 |
| 03 | [Scorer — score invoeren](03-scorer-flow.md) | Recorder | 12 | 10 | 0 |
| 04 | [Toeschouwer — leaderboard](04-spectator-leaderboard.md) | Toeschouwer | 10 | 10 | 0 |
| 05 | [Authenticatie en toegang](05-authentication-and-access.md) | Organisator, recorder | 7 | 4 | 0 |
| 06 | [Privacy, AVG en exports](06-privacy-and-exports.md) | Allen | 5 | 4 | 0 |
| 07 | [Baandatabase en open data](07-course-database.md) | Organisator | 7 | 3 | 0 |
| 08 | [Premium en toekomst](08-premium-and-future.md) | Organisator, club | 0 | 0 | 7 |
| 09 | [Infrastructuur en developer experience](09-infrastructure-and-devx.md) | Ontwikkelaar | 10 | 2 | 0 |
| 10 | [Baanbeheer — eigenaarschap en zichtbaarheid](10-course-ownership-and-visibility.md) | Organisator | 4 | 1 | 0 |

**Totaal:** 81 MVP (1.0), 58 Later (Na 1.0), 7 Premium (Na 1.0, premium) = 146 stories

## Voortgang

**Huidige stand (MVP / release 1.0):** 69 ✅ Done · 4 🔄 In Progress · 8 ⬜ To Do = **85%**

| Epic | MVP (1.0) | ✅ Done | 🔄 In Progress | ⬜ To Do | % |
|---|---|---|---|---|---|
| Visie en scope | 8 | 6 | 2 | 0 | 75% |
| Organisator | 18 | 17 | 0 | 1 | 94% |
| Scorer | 12 | 11 | 0 | 1 | 92% |
| Spectator | 10 | 10 | 0 | 0 | 100% |
| Authenticatie | 7 | 6 | 0 | 1 | 86% |
| Privacy/AVG | 5 | 3 | 1 | 1 | 60% |
| Baandatabase | 7 | 6 | 1 | 0 | 86% |
| Infrastructuur | 10 | 6 | 0 | 4 | 60% |
| Baanbeheer (eigenaar) | 4 | 4 | 0 | 0 | 100% |
| **Totaal** | **81** | **69** | **4** | **8** | **85%** |

> **Lifecycle:** ⬜ To Do → 🔄 In Progress → ✅ Done → 🟢 Confirmed
> Status per individuele story staat in [`progress.json`](progress.json), inclusief het `release`-veld. Werk na elke implementatiesessie bij — zie US-INFRA-12.

## Legenda

### Prioriteiten

| Label | Betekenis |
|---|---|
| **M** | Must have — MVP is niet volledig zonder deze story |
| **S** | Should have — sterk gewenst, maar geen blokkeerder |
| **C** | Could have — nice to have |
| **L** | Later — niet in MVP |

### Fase → release

`progress.json` heeft naast `fase` (MVP/Later/Premium) ook een `release`-veld. Vul bij nieuwe stories altijd beide in.

| Fase | Release-label | Betekenis |
|---|---|---|
| **MVP** | **1.0** | Onderdeel van de eerste publieke release / De Haenen-pilot |
| **Later** | **Na 1.0** | Gepland ná de eerste release, geen blokkerende functionaliteit |
| **Premium** | **Na 1.0 (premium)** | Ná de eerste release, mogelijk betaald |

### Story structuur

Elke user story volgt deze vaste opmaak:

```markdown
### US-[nummer] — [korte titel]

- **Rol:** [wie]
- **Doel:** [wil ik ...]
- **Waarde:** [zodat ...]
- **Prioriteit:** [M/S/C/L]
- **Fase:** [MVP / Later / Premium]
- **Status:** [⬜ To Do / 🔄 In Progress / ✅ Done] (optioneel op storyniveau — altijd verplicht in progress.json)
- **Afhankelijk van:** [US-xxx, US-yyy]
- **Acceptatiecriteria:**
  - ...
- **Opmerkingen:**
  - ...

**Technische specificatie** (indien al (deels) gebouwd)
**Componenten:** ...
**Data flow:** ...
```

## Nieuwe functionaliteit invullen

Wil je een nieuwe functionaliteit laten opnemen? Voeg een story toe aan het juiste epic-bestand in bovenstaande structuur, en zet een bijbehorende regel in [`progress.json`](progress.json):

```json
"XXX-99": { "title": "Korte titel", "fase": "MVP", "status": "todo", "release": "1.0", "notes": "Hoe het gaat werken, in één of twee zinnen" }
```

Gebruik `"fase": "MVP"` + `"release": "1.0"` voor alles dat vóór de eerste release moet werken, en `"fase": "Later"` + `"release": "Na 1.0"` voor de rest. `"fase": "Premium"` + `"release": "Na 1.0 (premium)"` is voor functionaliteit die mogelijk ooit betaald wordt (zie epic 08).

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
| Infrastructuur | INFRA- |
| Baanbeheer (eigenaar) | COO- |

---

*Dit is een levend document. Stories worden toegevoegd, bijgewerkt of gesloten op basis van productbeslissingen en feedback uit de pilot. Zie ook [`../DESIGN_DOCUMENT.md`](../DESIGN_DOCUMENT.md) voor de productvisie en [het oorspronkelijke technische ontwerpdocument] voor de volledige database/RLS/offline-sync-specificaties.*
