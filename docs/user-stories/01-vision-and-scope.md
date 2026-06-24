# Epic 01 — Visie en scope

## Epic beschrijving

Overkoepelende epics die de productvisie, kernprincipes en niet-functionele vereisten dekken. Deze stories gelden voor het hele platform en raken alle doelgroepen.

## Rationale

Voordat er een regel code geschreven wordt, moet duidelijk zijn wat het product wel en niet is. Deze stories leggen de basis: open source, open data, gratis kern, privacy-by-design. Ze zijn de toetssteen voor alle andere beslissingen.

---

## User stories

### US-VS-01 — Product open source beschikbaar

- **Rol:** Beheerder van het project
- **Doel:** De volledige broncode publiceren onder AGPL-3.0 op GitHub
- **Waarde:** Iedereen kan het platform gebruiken, aanpassen en zelf hosten; verbeteringen vloeien terug
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** geen
- **Acceptatiecriteria:**
  - Repository is publiek op GitHub
  - AGPL-3.0 LICENSE bestand aanwezig in root
  - README met uitleg over project, installatie en bijdragen
  - Contribution guidelines aanwezig (CONTRIBUTING.md)
  - Code of conduct aanwezig
- **Opmerkingen:**
  - Dit is de juridische en community-basis van het hele project
  - Premium features komen in een aparte, private repo

## Technische specificatie

**Componenten:** geen — dit is een repository-configuratie, geen UI-component
**Data flow:** n.v.t.
**API endpoints:** n.v.t.
**Validatie:** n.v.t.
**Staten:** n.v.t.
**i18n keys:** geen
**Acceptatiecriteria uitgebreid:**
  - Repository is publiek op GitHub → `LICENSE` bestand in root met AGPL-3.0 tekst
  - README bevat installatie-instructies (Docker Compose, .env config) en link naar docs
  - CONTRIBUTING.md met uitleg over commit-stijl, PR-proces, en branching-model
  - Code of Conduct (Contributor Covenant v2.1) in `CODE_OF_CONDUCT.md`

---

### US-VS-02 — Data altijd exporteerbaar

- **Rol:** Organisator van een toernooi
- **Doel:** Alle data van mijn toernooi kunnen exporteren in een open formaat
- **Waarde:** Ik ben niet afhankelijk van het platform; ik kan altijd migreren of een back-up maken
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-12
- **Acceptatiecriteria:**
  - Leaderboard data is beschikbaar als JSON via REST API (MVP)
  - Geen authenticatie nodig voor publieke toernooi-data
  - Export bevat: deelnemers, scores, flights, uitslag
  - Exportformaat is gedocumenteerd
- **Opmerkingen:**
  - CSV-export via UI komt later (US-PRI-05)
  - Dit is een kernprincipe uit het productmanifest; geen onderhandeling mogelijk

## Technische specificatie

**Componenten:** geen apart component — JSON-respons wordt direct via API endpoints geserveerd
**Data flow:** `tournament_leaderboard` view, `tournament_players` tabel, `scores` tabel → REST API response
**API endpoints:** `GET /api/tournaments/:id/leaderboard`, `GET /api/tournaments/:id/players`, `GET /api/tournaments/:id/scores` (nog te bouwen, `apps/web/app/api/tournaments/[id]/`)
**Validatie:** tournament_id is UUID; 404 als niet bestaat of niet publiek; geen auth vereist (publiek)
**Staten:** Success (200 + JSON array), Not Found (404), Error (500)
**i18n keys:** geen — API responses zijn data-only
**Acceptatiecriteria uitgebreid:**
  - Response JSON bevat dezelfde velden als `tournament_leaderboard` view in Supabase
  - Geen authenticatie nodig: endpoint is publiek (RLS op view toestaat SELECT voor anon)
  - CORS-headers aanwezig voor programmatische toegang
  - Exportformaat gedocumenteerd in `docs/api/leaderboard.md`

---

### US-VS-03 — Privacy-by-default

- **Rol:** Speler in een toernooi
- **Doel:** Dat mijn persoonsgegevens alleen worden gebruikt voor het toernooi en niet worden gedeeld met derden
- **Waarde:** Ik vertrouw het platform met mijn naam en handicap
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-PRI-01, US-PRI-02
- **Acceptatiecriteria:**
  - Geen tracking-cookies of analytics zonder toestemming
  - Toeschouwers hebben geen account nodig en laten geen spoor na
  - Speler kan verzoeken om naam te anonimiseren
  - Privacyverklaring is beschikbaar op de website
- **Opmerkingen:**
  - AVG-compliance is een randvoorwaarde voor de pilot
  - Zie epic 06 voor alle privacy-stories

## Technische specificatie

**Componenten:** `PrivacyNotice` (nog te bouwen, `components/common/PrivacyNotice.tsx`), `DisplayNameSelector` (nog te bouwen, `components/player/DisplayNameSelector.tsx`)
**Data flow:** geen data-ophaling voor privacy — alleen weergave van instellingen uit `tournament_players` tabel (veld `display_name` of aparte weergave-instelling)
**API endpoints:** geen aparte endpoint — directe Supabase query via `getSupabaseBrowser()`
**Validatie:** geen tracking-scripts geladen; analytics alleen met expliciete consent
**Staten:** n.v.t. — infrastructuur, geen UI-states
**i18n keys:** `privacy.notice`, `privacy.anonymize_request`, `privacy.no_tracking`
**Acceptatiecriteria uitgebreid:**
  - Geen Google Analytics, Facebook Pixel of andere tracking zonder toestemming
  - Supabase sessie-cookie is functioneel (geen toestemming nodig)
  - Toeschouwers-pagina's laden geen externe scripts
  - Privacyverklaring beschikbaar op `/privacy` (US-PRI-06)

---

### US-VS-04 — Geen ledenbeheer

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik alleen spelers voor dit specifieke toernooi hoef toe te voegen, zonder een ledenadministratie bij te houden
- **Waarde:** Ik kan snel een toernooi opzetten zonder bestaande systemen te dupliceren
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** geen
- **Acceptatiecriteria:**
  - Spelers worden per toernooi toegevoegd, niet in een centraal ledenbestand
  - Geen API of functie die een ledenlijst beheert
  - Geen koppeling met externe ledenadministraties in MVP
- **Opmerkingen:**
  - Dit is een bewuste non-goal: clubs hebben al ledensystemen (NGF, eigen administratie)
  - Het platform doet toernooien, geen ledenbeheer

## Technische specificatie

**Componenten:** geen — dit is een architectuurbeslissing, geen UI-component
**Data flow:** spelers worden altijd aangemaakt in `tournament_players` tabel met `tournament_id` foreign key; geen `profiles` koppeling verplicht
**API endpoints:** geen ledenbeheer-endpoints — alleen `POST /api/tournaments/:id/players` voor toernooigebonden spelers
**Validatie:** `profile_id` in `tournament_players` is optioneel (nullable), niet verplicht
**Staten:** n.v.t. — architectuurprincipe
**i18n keys:** geen
**Acceptatiecriteria uitgebreid:**
  - Geen centrale `members` tabel; spelers bestaan alleen in context van `tournament_players`
  - Geen API endpoint voor `/api/members` of `/api/players` zonder tournament_id filter
  - CSV-import (US-ORG-10) importeert direct in `tournament_players`, niet in `profiles`

---

### US-VS-05 — Nederlands als standaardtaal

- **Rol:** Organisator van een toernooi
- **Doel:** Dat de gehele interface in het Nederlands is
- **Waarde:** Ik en mijn clubleden kunnen het platform direct gebruiken zonder taalbarrière
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** geen
- **Acceptatiecriteria:**
  - Alle UI-teksten zijn in het Nederlands (MVP)
  - i18n infrastructuur aanwezig zodat Engels later kan worden toegevoegd
  - Golf-specifieke termen (flight, stableford, stroke index) correct vertaald
- **Opmerkingen:**
  - Engels wordt toegevoegd in fase 2
  - i18n skelet (key-structuur) is wel aanwezig vanaf dag 1

## Technische specificatie

**Componenten:** `LocaleLayout` (bestaand, `apps/web/app/[locale]/layout.tsx`), `NextIntlClientProvider` (bestaand via next-intl)
**Data flow:** messages uit `apps/web/messages/nl.json` worden geladen via `getMessages()` uit `next-intl/server` en doorgegeven aan `NextIntlClientProvider`
**API endpoints:** geen — i18n is client-side via `next-intl`
**Validatie:** geen
**Staten:** Fallback-toon Engels/Nederlands als key ontbreekt (configureerbaar via `onError` in next-intl)
**i18n keys:** alle keys in `nl.json` (zie bestaand bestand) — `common.*`, `tournament.*`, `scoring.*`, `leaderboard.*`, `errors.*`
**Acceptatiecriteria uitgebreid:**
  - Alle UI-strings zitten in message files, niet hardcoded in componenten
  - next-intl `<Trans>` of `t()` functie gebruikt in alle client-componenten
  - Locale routing via `[locale]` directory structuur (Next.js App Router)

---

### US-VS-06 — Offline-first architectuur

- **Rol:** Recorder (scorer) op de baan
- **Doel:** Dat ik scores kan invoeren ook zonder internetverbinding
- **Waarde:** Ik ben niet afhankelijk van het wisselende bereik op de golfbaan
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-04
- **Acceptatiecriteria:**
  - Score-app werkt volledig zonder internet
  - Scores worden lokaal opgeslagen (IndexedDB)
  - Automatische synchronisatie zodra verbinding hersteld is
  - Gebruiker ziet altijd of de app online of offline is
  - Geen dataverlies bij verbindingsuitval
- **Opmerkingen:**
  - Dit is een van de belangrijkste onderscheidende kenmerken
  - Zie epic 03 voor alle scorer-stories

## Technische specificatie

**Componenten:** `ScoreInput` (bestaand, `components/scorer/ScoreInput.tsx`), `SyncStatusBar` (bestaand, `components/scorer/SyncStatusBar.tsx`), `ScorerApp` shell (nog te bouwen, `app/[locale]/scorer/page.tsx`), `offline-db.ts` (bestaand, `lib/offline-db.ts`)
**Data flow:** Scores →IndexedDB (`pending_scores` table in Dexie) → bij online: `upsert_score_if_newer` RPC → Supabase `scores` table
**API endpoints:** `POST /api/validate-code` (bestaand, voor code-toegang); `supabase.rpc('upsert_score_if_newer', ...)` voor sync
**Validatie:** `strokes BETWEEN 1 AND 99` in database constraint; `updated_at` conflictresolutie in functie
**Staten:** Loading (Dexie open), Offline (yellow SyncStatusBar), Syncing (orange bar + spinner), Synced (green bar + ✅ badge), Error (red bar + retry knop)
**i18n keys:** `scoring.sync.*` (bestaand), `common.status.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - PWA manifest.json (`/manifest.json`) aanwezig met `display: standalone` voor installatie
  - Service Worker registreert cache-first strategie voor app-shell
  - Dexie database `opentour` met versie 1 schema: `pending_scores`, `local_tournaments`, `local_flights`
  - Scores worden direct in IndexedDB opgeslagen, onafhankelijk van netwerkstatus

---

### US-VS-07 — Responsive leaderboard

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik het leaderboard kan bekijken op mijn telefoon, laptop, tablet of TV
- **Waarde:** Ik kan het toernooi volgen op het apparaat dat ik bij me heb
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Leaderboard werkt op schermen van 360px (telefoon) tot 4K (TV)
  - Geen horizontale scroll op kleine schermen
  - Lettertype groot genoeg om op 2 meter afstand te lezen op TV
  - Layout past zich aan zonder verlies van essentiële informatie
- **Opmerkingen:**
  - Geen aparte app nodig voor TV; de browser volstaat
  - Kiosk-modus met automatisch scrollen komt later (US-SPE-08)

## Technische specificatie

**Componenten:** `LeaderboardClient` (bestaand, `components/leaderboard/LeaderboardClient.tsx`), `LeaderboardTable` (bestaand, `components/leaderboard/LeaderboardTable.tsx`), leaderboard page (bestaand, `app/[locale]/tournament/[id]/page.tsx`)
**Data flow:** `tournament_leaderboard` view → Cloudflare Worker (cache, 30s) → client-side polling (30s interval); fallback: direct Supabase REST
**API endpoints:** `GET /api/leaderboard/:tournamentId` (via Cloudflare Worker) of direct Supabase REST
**Validatie:** tournament_id is UUID; `status != 'draft'` voor publieke zichtbaarheid (via RLS); `is_public = true`
**Staten:** Loading (skeleton `LeaderboardSkeleton`), Empty (`"Nog geen scores ingevoerd"`), Error (retry knop + foutmelding), Success (table met rijen)
**i18n keys:** `leaderboard.*` (bestaand), `errors.leaderboard_unavailable` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Minimaal 360px viewport ondersteund: tabel schakelt flight-kolom naar `hidden sm:table-cell`
  - Leaderboard gebruikt `tabular-nums` voor monospace cijfers
  - Geen horizontale scroll op <360px: holes/18 kolom meest links, score rechts
  - Polling stopt wanneer `isActive = false` (status `finished` of `paused`)

---

### US-VS-08 — Engels als tweede taal (i18n)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik de interface kan laten toggelen tussen Nederlands en Engels
- **Waarde:** Internationale deelnemers en gasten kunnen het platform ook gebruiken
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-VS-05
- **Acceptatiecriteria:**
  - Taalswitcher beschikbaar in de UI (/nl/, /en/ of dropdown)
  - Alle UI-teksten vertaald naar het Engels
  - Leaderboard-content (spelersnamen, toernooinaam, scores) blijft onvertaald
  - Taalkeuze opgeslagen in localStorage; standaard Nederlands
  - NL fallback bij ontbrekende vertaling
- **Opmerkingen:**
  - i18n skelet (key-structuur) is al aanwezig vanaf MVP (US-VS-05)
  - Fase 2 van de roadmap; niet in MVP

---

### US-VS-09 — OpenTour unique selling points vs concurrentie

- **Rol:** Beheerder van het project
- **Doel:** Dat de unieke voordelen van OpenTour ten opzichte van bestaande oplossingen (Parrow, Scoreboard, eGolf4u) duidelijk zijn gedocumenteerd en communiceerbaar
- **Waarde:** Potentiële gebruikers en clubs kiezen voor OpenTour vanwege de open, privacy-vriendelijke en gratis aanpak
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-VS-01 t/m US-VS-07
- **Acceptatiecriteria:**
  - Vergelijkingstabel OpenTour vs Parrow vs Scoreboard vs eGolf4u is beschikbaar in de README of website
  - Unieke voordelen van OpenTour zijn geborgd in de productvisie en worden niet weg-ontwikkeld:
    - **Open source (AGPL):** geen vendor lock-in, zelf hosten of bijdragen
    - **Altijd gratis:** geen maandkosten, geen betaling per toernooi, geen verborgen kosten
    - **Offline-first:** uniek in de markt; scores invoeren zonder internet
    - **Geen account voor toeschouwers:** leaderboard is één klik, zonder drempel
    - **Open data / API-first:** alle data exporteerbaar, geen lock-in
    - **Privacy-by-default:** geen tracking, geen cookies, geen verkoop van data
    - **Self-hosting mogelijk:** draai je eigen instance met Docker Compose
    - **Nederlands product:** gemaakt door golfers voor golfers, AGPL-gelicenseerd
- **Opmerkingen:**
  - Dit is geen technische story maar een positionering- en communicatie-story
  - Deze voordelen moeten leidend zijn bij alle productbeslissingen
  - Parrow is duur (€125/maand of €99/event) en closed source — dat is ons grootste voordeel

## Technische specificatie

**Componenten:** geen — positioneringstekst in README en website, geen UI-component
**Data flow:** n.v.t.
**API endpoints:** n.v.t.
**Validatie:** n.v.t.
**Staten:** n.v.t.
**i18n keys:** geen
**Acceptatiecriteria uitgebreid:**
  - Vergelijkingstabel opgenomen in README.md of docs/competitive-analysis.md
  - Unieke voordelen zijn geborgd in de product roadmap en worden niet weg-ontwikkeld voor premium
  - "Altijd gratis kern" is vastgelegd als niet-onderhandelbaar productprincipe

---

## Open vragen

| # | Vraag |
|---|---|
| VS-O1 | Moet de i18n infrastructuur direct meertalige routes ondersteunen (/nl/, /en/) of volstaat één taal in MVP? |
| VS-O2 | Hoe omgaan met niet-NL gebruikers die deelnemen aan een Nederlands toernooi? Leaderboard is taal-onafhankelijk, maar UI dan? |
