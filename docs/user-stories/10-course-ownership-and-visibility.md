# Epic 10 — Baanbeheer: eigenaarschap en zichtbaarheid

## Epic beschrijving

Golfbanen (`courses`) hebben een eigenaar (`created_by`) en een zichtbaarheid (`is_public`). Een organisator beheert alleen zijn eigen banen, kan er onbeperkt aanmaken, en beslist zelf of een baan privé blijft of voor anderen zichtbaar wordt. Dit epic was voorheen een losstaand document (`08-course-owner-and-submit-flow.md`) met alleen een SMART-blok en geen doorgevoerde nummering in `index.md`/`progress.json`. Tijdens de documentatie-audit van 2026-07-08 is het samengevoegd tot een volwaardig epic, gecontroleerd tegen de daadwerkelijke RLS-policies en code.

## Rationale

Zonder eigenaarschap zou elke organisator elke baan kunnen bewerken — riskant zodra meerdere clubs dezelfde installatie gebruiken. Door banen privé-by-default te maken en zichtbaarheid expliciet te maken, blijft baanbeheer voorspelbaar terwijl de deur openstaat voor een latere "publiceer voor iedereen"-flow zonder dat de datamodel opnieuw hoeft.

---

## User stories

### US-COO-01 — Meerdere banen per organisator beheren

- **Rol:** Organisator
- **Doel:** Dat ik zoveel banen kan aanmaken en onderhouden als ik nodig heb
- **Waarde:** Ik kan meerdere golfbanen van mijn organisatie beheren vanuit één account
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** —
- **Acceptatiecriteria:**
  - Baanbeheer-overzicht toont alleen banen aangemaakt door de ingelogde gebruiker
  - Geen maximum aantal banen per organisator
- **Opmerkingen:**
  - Vanuit "Nieuw toernooi" kan een ontbrekende baan ook inline aangemaakt en direct geselecteerd worden

**Technische specificatie**
**Componenten:** `CoursesPage` (`app/[locale]/course/page.tsx`)
**Data flow:** `supabase.from('courses').select(...).eq('created_by', authData.user.id)`
**Validatie:** vereist ingelogde sessie; bij ontbrekende sessie: "Je sessie is verlopen. Log opnieuw in."

---

### US-COO-02 — Alleen eigenaar mag een baan bewerken

- **Rol:** Organisator
- **Doel:** Dat alleen ikzelf de holes, tees en instellingen van mijn baan kan wijzigen
- **Waarde:** Andere organisatoren kunnen mijn baangegevens niet per ongeluk of moedwillig aanpassen
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** —
- **Acceptatiecriteria:**
  - Een niet-eigenaar kan geen UPDATE op een baan uitvoeren, ook niet via een directe API-call
- **Opmerkingen:**
  - Afgedwongen op databaseniveau, niet alleen in de UI

**Technische specificatie**
**RLS-policy:** `courses_update_own` op tabel `courses` — `USING/WITH CHECK (created_by = auth.uid())`

---

### US-COO-03 — Bestaande banen retroactief aan een eigenaar toewijzen

- **Rol:** Beheerder van de installatie
- **Doel:** Dat banen die vóór de invoering van eigenaarschap zijn aangemaakt, alsnog een eigenaar krijgen
- **Waarde:** Geen "weesbanen" zonder `created_by`, zodat RLS-policies consistent blijven werken
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-COO-02
- **Acceptatiecriteria:**
  - 100% van de bestaande banen heeft een ingevulde eigenaar na de migratie
- **Opmerkingen:**
  - Eenmalige actie, geen doorlopende functionaliteit

**Technische specificatie**
**Migratie:** `assign_existing_courses_owner` — backfill naar `info@vanhoutensolutions.nl` voor banen zonder `created_by`

---

### US-COO-04 — Baan privé houden

- **Rol:** Organisator
- **Doel:** Dat een baan die ik aanmaak standaard alleen voor mij zichtbaar is
- **Waarde:** Ik kan een baan voorbereiden zonder dat deze meteen door andere organisatoren gebruikt kan worden
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** —
- **Acceptatiecriteria:**
  - Nieuwe banen krijgen `is_public = false` als standaardwaarde
  - Holes, tees en loops van een privébaan zijn niet zichtbaar voor andere organisatoren
- **Opmerkingen:**
  - Zelfde zichtbaarheidsregel toegepast op `holes`, `tees`, `loops` en `loop_holes` (elk met een eigen SELECT-policy die teruggrijpt op `courses.is_public`)

**Technische specificatie**
**Migratie:** `courses_private_visibility` — `courses.is_public BOOLEAN NOT NULL DEFAULT false`
**RLS-policy:** `courses_select_public` — `USING (is_public = true OR created_by = auth.uid())`, analoog voor `holes_select`, `tees_select`, `loops_select`, `loop_holes_select`

---

### US-COO-05 — Baan publiceren voor andere organisatoren of publiek

- **Rol:** Organisator
- **Doel:** Dat ik een baan die ik heb aangemaakt kan vrijgeven zodat andere organisatoren hem ook kunnen gebruiken
- **Waarde:** Populaire banen hoeven niet door elke organisator opnieuw ingevoerd te worden
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-COO-04
- **Acceptatiecriteria:**
  - Er is een publiceer-actie in de UI (nog te bouwen)
  - Publiceren vereist een review-stap (voorkomt spam/onjuiste baangegevens)
- **Opmerkingen:**
  - Databasekant is al voorbereid (`is_public` bestaat en werkt), alleen de submit/review-flow en de UI-knop ontbreken nog
  - `is_public` kan momenteel alleen via een directe databasewijziging gezet worden, niet via de UI

---

*Dit epic is onderdeel van het levende documentatiesysteem. Zie [`progress.json`](progress.json) voor actuele status per story.*
