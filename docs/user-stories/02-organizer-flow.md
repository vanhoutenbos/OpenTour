# Epic 02 — Organisator: toernooibeheer

## Epic beschrijving

Alles wat een organisator nodig heeft om een golftoernooi van begin tot eind te beheren: aanmaken, configureren, spelers toevoegen, flights indelen, status beheren en afsluiten.

## Rationale

De organisator is de primaire doelgroep van het platform. Als het voor de organisator niet werkt, is er geen toernooi en dus geen reden voor recorders of toeschouwers om het platform te gebruiken. Deze epics dekken de volledige lifecycle van een toernooi.

---

## User stories

### US-ORG-01 — Toernooi aanmaken

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een nieuw toernooi kan aanmaken met een naam, datum, baan en scoringsformat
- **Waarde:** Ik kan in enkele minuten een toernooi opzetten
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-CRS-01, US-CRS-02
- **Acceptatiecriteria:**
  - Formulier met velden: naam, beschrijving (optioneel), datum, baan (kiezen of aanmaken), format (stroke/stableford/match), scoring type (gross/net)
  - Na opslaan komt het toernooi in status `draft`
  - Organisator wordt doorgestuurd naar het beheerscherm van het nieuwe toernooi
  - Minimale invoer voor een werkend toernooi: naam + datum + baan + format
- **Opmerkingen:**
  - Dit is het startpunt van alle organisator-flows
  - Later: templates voor terugkerende toernooien

## Technische specificatie

**Componenten:** `NewTournamentPage` (bestaand, `app/[locale]/tournament/new/page.tsx` — 4-stappen wizard), `CourseSelector` (inline in wizard, biedt course lijst uit `courses` tabel)
**Data flow:** formulierstate → `sessionStorage` (sleutel `opentour-tournament-new`) → bij submit: `INSERT INTO tournaments` via Supabase → redirect naar `/nl/tournament/{id}/manage`
**API endpoints:** geen — directe Supabase insert via `getSupabaseBrowser()`
**Validatie:** `name` is verplicht (niet leeg); `start_date` optioneel (datum-string of null); `format` moet geldige waarde zijn; `course_id` optioneel (kan later)
**Staten:** Loading (submit-knop disabled met "Aanmaken..."), Error (rood tekstveld `setError`), Success (redirect naar manage pagina), Session verlopen (redirect naar `/nl/login`)
**i18n keys:** `tournament.create.*` (bestaand), `tournament.format.*` (bestaand), `tournament.scoring.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Wizard heeft 4 stappen: basics → course → format → confirm, met voortgangsbalk
  - Formulier-state persist in sessionStorage zodat browser-vernieuwing geen data verliest
  - Minimale velden: naam + datum + baan + format; zonder naam kan "Volgende" niet worden ingedrukt

---

### US-ORG-02 — Spelers toevoegen (handmatig)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik handmatig spelers kan toevoegen aan mijn toernooi met naam en optionele handicap
- **Waarde:** Ik bouw een deelnemerslijst op zonder afhankelijk te zijn van imports
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Invoerveld voor naam (verplicht) en handicap (optioneel, bereik -10 tot +54)
  - Speler wordt direct toegevoegd aan de deelnemerslijst
  - Speler kan aan een flight worden toegewezen (of later via flight-beheer)
  - Overzicht van alle toegevoegde spelers met mogelijkheid tot verwijderen
  - Duplicate controle op naam binnen hetzelfde toernooi (waarschuwing)
- **Opmerkingen:**
  - CSV-import komt in fase 2 (US-ORG-08)
  - Geen ledenbeheer: spelers bestaan alleen binnen dit toernooi

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand, `app/[locale]/tournament/[id]/manage/page.tsx` — tab "Spelers"), `PlayerForm` (inline in manage page: naam + handicap + gender inputs)
**Data flow:** `INSERT INTO tournament_players` via Supabase → `loadData()` herlaadt spelerslijst en categorieën
**API endpoints:** geen — directe Supabase insert via `getSupabaseBrowser()`
**Validatie:** `name` is verplicht (niet leeg/niet alleen whitespace); `handicap` optioneel maar moet tussen -10 en 54 als ingevuld (database CHECK constraint); duplicate controle op naam binnen toernooi (waarschuwing, geen blokkade)
**Staten:** Loading (laadt data in `useEffect`), Empty ("Nog geen spelers toegevoegd."), Error (geen aparte error-state — mislukte insert wordt stil genegeerd), Success (speler verschijnt direct in lijst)
**i18n keys:** `tournament.players.add`, `tournament.players.name`, `tournament.players.handicap`, `tournament.players.gender`, `tournament.players.remove`, `tournament.players.duplicate_warning`
**Acceptatiecriteria uitgebreid:**
  - Speler wordt direct toegevoegd via `supabase.from('tournament_players').insert(...)` bij klik op "+ Toevoegen"
  - Speler krijgt `status: 'registered'` bij aanmaak (default)
  - Formuliervelden worden gereset na toevoegen
  - Na toevoegen wordt `loadData()` aangeroepen om de lijst te verversen

---

### US-ORG-03 — Flights automatisch genereren

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik flights automatisch kan laten genereren op basis van het aantal spelers
- **Waarde:** Ik hoef niet handmatig in te delen; het systeem doet het voor mij
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-02
- **Acceptatiecriteria:**
  - Keuze: aantal spelers per flight (standaard 4)
  - Systeem verdeelt spelers gelijkmatig over flights
  - Flights krijgen een naam (Flight A, Flight B, etc.)
  - Organisator kan het resultaat bekijken en aanpassen
- **Opmerkingen:**
  - Handmatig aanpassen (US-ORG-11) is altijd mogelijk na genereren
  - Later: indelen op handicap, voorkeuren, of random

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Flights"), flight generator form (inline: starttijd, interval, max spelers, startholes)
**Data flow:** formulierparameters → `supabase.rpc('generate_flights', {...})` → functie verwijdert oude flights, verdeelt spelers over categorieën en startgaten → new flights in `flights` table → `loadData()` herlaadt
**API endpoints:** `supabase.rpc('generate_flights', ...)` — bestaande PostgreSQL functie (migratie 007)
**Validatie:** `p_start_time` is verplicht (datetime-local input); `p_max_players_per_flight` tussen 1-4; er moeten categorieën bestaan voordat flights gegenereerd kunnen worden; anders: gele waarschuwing "Maak eerst categorieën aan"
**Staten:** Loading (knop "Genereren..."), Error (rood tekstveld onder generator), Geen categorieën (gele waarschuwing), Geen flights ("Nog geen flights gegenereerd."), Success (flight lijst met spelers per flight)
**i18n keys:** `tournament.flights.generate`, `tournament.flights.start_time`, `tournament.flights.interval`, `tournament.flights.max_players`, `tournament.flights.start_holes`, `tournament.flights.delete_all`, `tournament.flights.no_categories`
**Acceptatiecriteria uitgebreid:**
  - `generate_flights` RPC-functie verwijdert eerst alle bestaande flights (`DELETE FROM flights WHERE tournament_id = p_tournament_id`)
  - Spelers worden verdeeld over startgaten per categorie, gesorteerd op handicap (hoogste eerst)
  - Flight naam volgt patroon: `{Categorie} - Flight {gatenummer}.{volgnummer}`
  - Starttijden worden automatisch berekend met opgegeven interval

---

### US-ORG-04 — Starttijden per flight instellen

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik per flight een starttijd kan instellen
- **Waarde:** Deelnemers weten wanneer ze moeten starten
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-03
- **Acceptatiecriteria:**
  - Per flight kan een starttijd worden ingevoerd (datum + tijd)
  - Starttijden worden getoond op het leaderboard en in de scoreer-app
  - Eerste starttijd instellen → automatisch starttijden voor volgende flights (interval instelbaar)
- **Opmerkingen:**
  - Later: starttijden ook per hole (shotgun start, wave start)

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Flights"), starttijd per flight wordt getoond in flight lijst (inline, momenteel read-only)
**Data flow:** `flights.start_time` veld wordt ingesteld bij flight-generatie; later: apart bewerk-veld per flight via `UPDATE flights SET start_time = ...`
**API endpoints:** `supabase.rpc('generate_flights', ...)` met `p_start_time` parameter behandelt starttijdberekening
**Validatie:** `start_time` moet een geldige ISO datetime zijn; bij generatie wordt interval toegepast vanaf eerste starttijd
**Staten:** Niet gegenereerd ("Nog geen flights gegenereerd."), Gegenereerd (flight lijst met tijden weergegeven in `HH:MM` formaat via `toLocaleTimeString('nl-NL')`)
**i18n keys:** `tournament.flights.start_time` (hergebruikt)
**Acceptatiecriteria uitgebreid:**
  - Starttijd per flight wordt weergegeven in flight-lijst op manage pagina
  - Leaderboard toont starttijd per flight (via `flight.start_time` in leaderboard view — nog niet in view, moet worden toegevoegd)
  - Scoreer-app toont starttijd bij flight-selectie
  - Automatische starttijd-berekening: eerste flight start op `p_start_time`, volgende flights met `p_interval_minutes` ertussen

---

### US-ORG-05 — Toernooistatus wijzigen

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik de status van mijn toernooi kan wijzigen naar draft, active, paused of finished
- **Waarde:** Ik heb controle over de toernooiflow en kan reageren op omstandigheden
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Status `draft`: alleen organisator en recorders met code zien het toernooi
  - Status `active`: leaderboard zichtbaar voor publiek, scores kunnen worden ingevoerd
  - Status `paused`: scores kunnen niet worden ingevoerd, leaderboard toont pauzebericht
  - Status `finished`: score-invoer geblokkeerd, eindstand bevroren
  - Alle transitites zijn omkeerbaar (ook `finished` terug naar `active`)
  - Bevestigingsdialoog bij overgang naar `finished`
- **Opmerkingen:**
  - Dit is de ruggengraat van het toernooi-beheer
  - Pauzeren altijd met reden (US-ORG-06)

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — status actie knoppen in header), `PauseBanner` (bestaand, `components/leaderboard/PauseBanner.tsx`), pauze-modal (inline in manage page)
**Data flow:** `UPDATE tournaments SET status = 'active'|'paused'|'finished'` via Supabase → `loadData()` herlaadt → UI toont nieuwe status-badge en actieknoppen
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** status transitie moet geldig zijn (draft→active, active→paused, active→finished, paused→active, finished→active); `pause_reason` verplicht bij `paused`; bevestigingsdialoog bij `finished`
**Staten:** Loading (skeletons), Status badges (groen/actief, geel/gepauseerd, blauw/afgelopen, grijs/concept), Pauze-modal (open/gesloten)
**i18n keys:** `tournament.actions.*`, `tournament.status.*`, `tournament.pause.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Status-knoppen tonen alleen relevante acties voor huidige status (draft: starten; active: pauzeren/afsluiten; paused: hervatten; finished: heropenen)
  - `draft` toernooi is niet zichtbaar voor publiek (RLS: `tournaments_select_public` filtert op `status != 'draft'`)
  - `finished` blokkeert score-invoer (check in recorder flow)
  - Bevestigingsdialoog bij `finished` met uitleg dat scores niet meer kunnen worden gewijzigd

---

### US-ORG-06 — Toernooi pauzeren met reden

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik het toernooi kan pauzeren en een reden kan opgeven
- **Waarde:** Toeschouwers en spelers begrijpen waarom het leaderboard niet meer ververst
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-05
- **Acceptatiecriteria:**
  - Bij pauzeren: tekstveld voor reden (verplicht, bijv. "Weersomstandigheden — hervatting verwacht om 14:30")
  - Reden wordt prominent getoond op het leaderboard
  - Reden wordt getoond in de scoreer-app
  - Scores kunnen niet worden ingevoerd of gesynchroniseerd zolang status `paused` is
- **Opmerkingen:**
  - Zonder duidelijke pauzer reden ontstaat verwarring bij toeschouwers

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — pauze-modal met reden-veld), `PauseBanner` (bestaand, `components/leaderboard/PauseBanner.tsx`)
**Data flow:** modal input → `UPDATE tournaments SET status='paused', pause_reason='...'` via Supabase → PauseBanner op leaderboard toont `pause_reason`
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** `pause_reason` is verplicht (niet leeg); max 500 karakters; wordt getoond op leaderboard en in scorer-app
**Staten:** Modal open (inputveld met placeholder "bijv. Weersomstandigheden..."), Modal gesloten, Banner actief (leaderboard toont gele banner met reden)
**i18n keys:** `tournament.pause.banner`, `tournament.pause.reason_label`, `tournament.pause.modal_title`, `tournament.pause.modal_description`, `tournament.pause.modal_confirm` (alleen `banner` en `reason_label` bestaan al)
**Acceptatiecriteria uitgebreid:**
  - Pause-reason wordt opgeslagen in `tournaments.pause_reason` kolom
  - Leaderboard toont `PauseBanner` component wanneer `status === 'paused' && pause_reason !== null`
  - Score-invoer geblokkeerd (scorer app checked `tournaments.status` bij sync-poging)
  - Bij hervatten: `pause_reason` wordt gereset naar null (`updateStatus('active', { pause_reason: null })`)

---

### US-ORG-07 — Speler markeren als DNS, DNF of DSQ

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een speler kan markeren als Did Not Start, Did Not Finish, of Disqualified
- **Waarde:** De deelnemerslijst en het leaderboard blijven accuraat
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-02
- **Acceptatiecriteria:**
  - Statusopties per speler: registered, confirmed, withdrawn, dns, dnf, dsq
  - DNS/DNF/DSQ spelers verschijnen onderaan het leaderboard met een duidelijke badge
  - DNS/DNF/DSQ spelers worden uitgesloten van de rangschikking
  - Ingevoerde scores van DNF-spelers blijven bewaard
  - Organisator kan de status op elk moment wijzigen
- **Opmerkingen:**
  - Conform NGF-wedstrijdregels
  - Withdrawn = teruggetrokken voor start (volledig uit leaderboard)

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Spelers" toont status per speler, maar heeft nog geen status-wijziging UI), `PlayerStatusDropdown` (nog te bouwen, `components/player/PlayerStatusDropdown.tsx` of inline in manage page)
**Data flow:** `UPDATE tournament_players SET status = 'dns'|'dnf'|'dsq' WHERE id = ...` via Supabase → leaderboard view herberekent positie (DNS/DNF/DSQ onderaan, withdrawn uitgesloten)
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** status moet geldige waarde zijn (`'registered' | 'confirmed' | 'withdrawn' | 'dns' | 'dnf' | 'dsq'`); `withdrawn` verwijdert speler uit leaderboard (view filtert `WHERE tp.status NOT IN ('withdrawn')`)
**Staten:** Default (status badge met kleur), Dropdown open (status opties), Gewijzigd (direct updated via `UPDATE` + `loadData()`)
**i18n keys:** `tournament.player_status.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Leaderboard view `tournament_leaderboard` sluit `withdrawn` uit (`WHERE tp.status NOT IN ('withdrawn')`)
  - DNS/DNF/DSQ spelers krijgen `position` na alle actieve spelers (view gebruikt `CASE WHEN player_status IN ('dns','dnf','dsq') THEN 1 ELSE 0 END ASC`)
  - Scores van DNF-spelers blijven in de database (alleen status wijzigt)
  - Organisator kan status wijzigen via dropdown op manage page (nog te implementeren)

---

### US-ORG-08 — Scorecorrecties uitvoeren

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik scores kan corrigeren voor een speler, ook nadat ze zijn ingediend
- **Waarde:** Fouten kunnen worden hersteld zonder het hele toernooi te resetten
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-01
- **Acceptatiecriteria:**
  - Organisator kan per speler per hole de score aanpassen
  - Correctie genereert een nieuwe `updated_at` timestamp die altijd wint bij sync
  - Leaderboard wordt direct bijgewerkt na correctie
  - Audit log: wijzigingen worden gelogd met wie en wanneer (later)
- **Opmerkingen:**
  - De organisator heeft altijd override over recorder-scores
  - Dit is essentieel voor vertrouwen in de uitslag

## Technische specificatie

**Componenten:** `ScoreGrid` (bestaand, `components/score-grid/ScoreGrid.tsx` — Excel-stijl grid voor organisator), `ScoreGrid` is al beschikbaar op manage page (nog niet geïntegreerd in tab)
**Data flow:** `SELECT * FROM scores WHERE tournament_id = ...` → grid toont alle scores per speler per hole → `UPDATE scores SET strokes = ...` bij wijziging (via `upsert` met `onConflict`)
**API endpoints:** geen — directe Supabase upsert via `getSupabaseBrowser()` (bestaande implementatie in ScoreGrid.tsx gebruikt `supabase.from('scores').upsert()`)
**Validatie:** `strokes BETWEEN 1 AND 99` (database CHECK constraint); `updated_at` wordt automatisch gezet door trigger; scores kunnen alleen worden gewijzigd door organisator (RLS: `scores_all_organizer`)
**Staten:** Loading (skeleton grid), Data loaded (grid met ingevulde scores), Saving (debounced auto-save om de 2s), Saved ("Laatst opgeslagen: HH:MM"), Error (console.error, geen UI feedback)
**i18n keys:** `tournament.corrections.title`, `tournament.corrections.saving`, `tournament.corrections.saved`
**Acceptatiecriteria uitgebreid:**
  - ScoreGrid component bestaat al maar is nog niet geïntegreerd in de manage page (moet worden toegevoegd als apart tab of sub-tab)
  - Debounced auto-save: wijzigingen worden na 2s inactiviteit weggeschreven naar Supabase
  - Leaderboard wordt niet real-time bijgewerkt na correctie (polling interval 30s vangt wijzigingen op)
  - Audit log (wie/wat/wanneer) komt later — niet in MVP

---

### US-ORG-09 — Toegangscodes genereren

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik toegangscodes kan genereren waarmee recorders scores kunnen invoeren
- **Waarde:** Ik hoef geen accounts aan te maken voor elke recorder; een code volstaat
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Code is 8 alfanumerieke tekens, hoofdletterongevoelig (bijv. GOLF3X7K)
  - Code standaard 24 uur geldig (instelbaar door organisator)
  - Code gekoppeld aan een specifiek toernooi
  - Meerdere codes per toernooi mogelijk
  - Codes kunnen worden gedeeld via WhatsApp, e-mail, print of mondeling
  - Organisator kan een code op elk moment deactiveren
- **Opmerkingen:**
  - Dit vervangt de noodzaak voor permanente recorder-accounts in MVP
  - Rate limiting beschermt tegen brute-force (5 pogingen / 5 minuten)
  - Zie epic 05 voor authenticatie-details

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Toegangscodes" met code-overzicht, genereer-knop, deactiveren, kopiëren)
**Data flow:** `supabase.rpc('generate_access_code')` → retourneert 8-karige code → `INSERT INTO access_codes (code, tournament_id, created_by, expires_at)` → code verschijnt in lijst
**API endpoints:** `POST /api/validate-code` (bestaand, `apps/web/app/api/validate-code/route.ts`) voor recorder login; `supabase.rpc('generate_access_code')` voor code-generatie
**Validatie:** code is 8 alfanumerieke tekens (geen 0/O/1/I voor leesbaarheid); `expires_at` default now() + 24 hours; rate limiting: 5 mislukte pogingen per IP per 5 minuten (via Cloudflare Worker WAF of edge middleware)
**Staten:** Loading (code lijst laadt), Empty ("Nog geen codes aangemaakt."), Active (groene code, "Kopieer" + "Deactiveer" knoppen), Expired (grijs, "Verlopen" label), Gedeactiveerd (grijs, "Gedeactiveerd" label)
**i18n keys:** `tournament.codes.generate`, `tournament.codes.deactivate`, `tournament.codes.copy`, `tournament.codes.copied`, `tournament.codes.expired`, `tournament.codes.deactivated`, `tournament.codes.no_codes`, `tournament.codes.valid_until`
**Acceptatiecriteria uitgebreid:**
  - Code-generatie via `generate_access_code()` functie: gebruikt character set `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (exclusief 0, O, 1, I)
  - Standaard 24 uur geldig (`expires_at = now() + INTERVAL '24 hours'`)
  - Code is hoofdletterongevoelig bij validatie (ge-Uppered in `POST /api/validate-code`)
  - Meerdere codes per toernooi mogelijk (geen limiet)
  - Deactiveren: `UPDATE access_codes SET is_active = false WHERE id = ...`

---

### US-ORG-10 — Spelers importeren via CSV

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een CSV-bestand kan uploaden met spelersnamen en handicaps
- **Waarde:** Ik kan grote deelnemerslijsten snel inladen zonder handmatig typen
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-ORG-02
- **Acceptatiecriteria:**
  - CSV met kolommen: naam, handicap (optioneel), e-mail (optioneel)
  - UTF-8 met BOM (Excel-compatibel)
  - Validatie na upload: ontbrekende velden worden getoond
  - Organisator kan ontbrekende data aanvullen voor activering
  - Duplicate waarschuwing bij dubbele namen
- **Opmerkingen:**
  - Niet in MVP: pilot heeft kleine deelnemersaantallen (20-50)
  - Wordt belangrijk zodra grotere clubs gaan gebruiken

---

### US-ORG-11 — Flights handmatig aanpassen (drag-and-drop)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik spelers handmatig kan verplaatsen tussen flights
- **Waarde:** Ik kan de indeling aanpassen bij uitval, wissels of speciale verzoeken
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-03
- **Acceptatiecriteria:**
- Speler kan per drag-and-drop naar een andere flight worden verplaatst
- Wijzigingen worden direct opgeslagen
- Leaderboard toont de bijgewerkte flight-indeling
- **Opmerkingen:**
  - Drag-and-drop is wenselijk maar een eenvoudige dropdown-selectie volstaat ook voor MVP

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Flights" toont flights met spelers), `FlightPlayerSelector` (nog te bouwen — dropdown per speler om flight_id te wijzigen)
**Data flow:** `UPDATE tournament_players SET flight_id = <new_flight_id> WHERE id = <player_id>` via Supabase → `loadData()` herlaadt flights en spelers
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** `flight_id` moet verwijzen naar een bestaande flight in hetzelfde toernooi; een flight mag niet meer spelers bevatten dan `max_players` (4 default)
**Staten:** Loading, Flight list (bestaande flights met spelers), Empty ("Nog geen flights gegenereerd.")
**i18n keys:** `tournament.flights.move_player`, `tournament.flights.player_in_flight`
**Acceptatiecriteria uitgebreid:**
  - MVP volstaat met een dropdown per speler in het flight-overzicht om flight te wijzigen
  - Wijziging wordt direct opgeslagen (geen aparte save-knop)
  - Leaderboard toont bijgewerkte flight-indeling bij volgende poll (30s)
  - Drag-and-drop komt later; niet geblokkeerd voor MVP

---

### US-ORG-12 — Einduitslag bekijken

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik de definitieve einduitslag kan inzien nadat het toernooi is afgesloten
- **Waarde:** Ik kan de uitslag communiceren naar deelnemers en archiveren
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-05
- **Acceptatiecriteria:**
  - Einduitslag is bereikbaar via een stabiele URL (ook na afsluiten)
  - Toont: positie, naam, totaalscore, score to par, handicap, flight
  - Leaderboard blijft permanent beschikbaar (archief)
  - Geen verdere wijzigingen mogelijk aan scores na `finished`
- **Opmerkingen:**
  - Dit is de eindstand die de organisator kan exporteren en delen
  - Zie epic 06 voor exportmogelijkheden

## Technische specificatie

**Componenten:** `LeaderboardClient` (bestaand, `components/leaderboard/LeaderboardClient.tsx`), `LeaderboardTable` (bestaand, `components/leaderboard/LeaderboardTable.tsx`), leaderboard page (bestaand, `app/[locale]/tournament/[id]/page.tsx`)
**Data flow:** `tournament_leaderboard` view → REST API (Cloudflare Worker of direct Supabase) → LeaderboardClient → LeaderboardTable
**API endpoints:** `GET /api/leaderboard/:tournamentId` of direct Supabase REST op `tournament_leaderboard` view
**Validatie:** toernooi moet bestaan en `is_public = true`; bij `status = 'finished'` blijven scores bevroren (geen nieuwe inserts mogelijk via RLS? RLS staat inserts alleen toe bij actieve codes, maar `scores_insert_recorder` checkt niet op status — moet worden toegevoegd)
**Staten:** Loading (skeleton), Empty ("Nog geen scores ingevoerd"), Error (retry), Success (leaderboard table met posities)
**i18n keys:** `leaderboard.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Leaderboard-page werkt ook als toernooi `finished` is (geen restrictie op SELECT)
  - URL is stabiel: `/nl/tournament/{id}` blijft altijd bereikbaar
  - View `tournament_leaderboard` berekent positie op basis van format (stableford: hoogste punten, stroke: laagste slagen)
  - Polling stopt na `finished` (`isActive = false` in LeaderboardClient), maar data blijft zichtbaar

---

### US-ORG-13 — Toernooi voor meerdere rondes instellen

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een meerdaags toernooi kan instellen met 2 of meer rondes
- **Waarde:** Ik kan 36-holes of 54-holes evenementen organiseren
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Bij aanmaken: keuze voor aantal rondes (1, 2, 3, 4)
  - Scores worden per ronde bijgehouden
  - Leaderboard toont subtotalen per ronde en totaal
  - Zelfde of verschillende baan per ronde mogelijk
- **Opmerkingen:**
  - MVP heeft alleen 1 ronde (18 holes)
  - De Haenen pilot gebruikt enkele ronden

---

### US-ORG-14 — Spelerslijst filteren en doorzoeken

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik de spelerslijst kan filteren op status (confirmed, DNS, DNF) en doorzoeken op naam
- **Waarde:** Ik vind snel een specifieke speler in een grote lijst
- **Prioriteit:** C
- **Fase:** Later
- **Afhankelijk van:** US-ORG-02
- **Acceptatiecriteria:**
  - Filter op status: alle, confirmed, withdrawn, dns, dnf, dsq
  - Zoekveld voor naam
  - Resultaten worden live gefilterd tijdens typen
- **Opmerkingen:**
  - Handig bij grotere toernooien, niet essentieel voor MVP

---

### US-ORG-15 — Toernooi-sjablonen voor terugkerende evenementen

- **Rol:** Planner/organisator van een toernooireeks
- **Doel:** Dat ik wedstrijden kan aanmaken op basis van een sjabloon met vaste instellingen (baan, format, type, branding)
- **Waarde:** Ik kan in één klik een terugkerend toernooi (wekelijkse clubcompetitie) klaarzetten zonder alles opnieuw in te vullen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Organisator kan een voltooid toernooi opslaan als sjabloon
  - Sjabloon bevat: baan, format, scoring type (gross/net), optionele branding/kleuren
  - Bij nieuw toernooi: kiezen uit beschikbare sjablonen
  - Datum wordt apart gevraagd; alle andere velden worden overgenomen
  - Sjablonen zijn beheerbaar (bewerken, verwijderen, delen binnen club)
  - Terugkerend sjabloon kan automatisch een reeks aanmaken (bv. elke donderdag in juli)
- **Opmerkingen:**
  - Gaat verder dan eenvoudig dupliceren: sjablonen zijn herbruikbaar en deelbaar
  - Vergelijkbaar met Parrow's Planner-rol "wedstrijden creëren op basis van sjablonen"
  - Competitiekalender (reeks toernooien) valt onder deze story

---

### US-ORG-16 — Notificaties naar deelnemers (e-mail, SMS, push)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik deelnemers kan informeren over starttijden, statuswijzigingen en uitslag via e-mail, SMS, of pushnotificatie
- **Waarde:** Spelers worden direct bereikt op hun voorkeurskanaal zonder dat ik ze individueel hoef te benaderen
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-ORG-01, optioneel US-ORG-02 (contactveld toevoegen)
- **Acceptatiecriteria:**
  - Organisator kan bij elke speler een e-mailadres en/of telefoonnummer toevoegen (optioneel)
  - Automatische notificatie bij: toernooi active (starttijden), toernooi paused, toernooi finished (uitslag)
  - Organisator kan handmatig een bericht naar alle deelnemers sturen
  - Kanaalkeuze per notificatie: e-mail, SMS, of beide
  - Bericht-sjablonen: organisator kan templates beheren voor elk type notificatie
  - Notificatie bevat: toernooinaam, relevante link (leaderboard), korte boodschap
  - Rate limiting: max 5 e-mails / 5 SMS per toernooi per dag
  - Speler kan aangeven geen notificaties te willen ontvangen (per toernooi)
- **Opmerkingen:**
  - E-mail via SMTP/Resend/Mailgun; SMS via Twilio
  - Staat in §4.2 van het ontwerpdocument als "Handig maar later"
  - Vergelijkbaar met Parrow's "Templates voor e-mails, sms-berichten en meldingen"

---

### US-ORG-17 — Seizoensranglijsten en clubstatistieken

- **Rol:** Organisator van een club
- **Doel:** Dat ik over meerdere toernooien een seizoensranglijst kan samenstellen met statistieken
- **Waarde:** Ik kan een clubkampioenschap of jaarranglijst opbouwen zonder aparte administratie
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-ORG-12, US-SPE-07, US-PRM-01
- **Acceptatiecriteria:**
  - Organisator kan een "seizoen" aanmaken en toernooien eraan koppelen
  - Seizoensranglijst toont punten over alle toernooien heen
  - Spelers die aan meerdere toernooien meedoen worden automatisch samengevoegd op naam
  - Statistieken: aantal toernooien, gemiddelde score, beste ronde
  - Filter op kalenderjaar of zelf in te stellen periode
  - Club-branding mogelijk (premium)
- **Opmerkingen:**
  - Merge op naam is eenvoudig maar kan fouten geven bij dubbele namen
  - Vereist premium voor club-branding (US-PRM-01)
  - Staat in roadmap fase 3

---

### US-ORG-18 — Online betaling via iDeal voor toernooideelname

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik deelnemers online kan laten betalen bij inschrijving via iDeal of creditcard
- **Waarde:** Ik hoef geen contant geld of overschrijvingen te verwerken; betaling verloopt automatisch
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-ORG-02, US-ORG-15 (sjablonen)
- **Acceptatiecriteria:**
  - Organisator kan per toernooi een deelnameprijs instellen (€0 = gratis)
  - Betaling via iDeal (NL) en creditcard (internationaal) via Stripe of Mollie
  - Speler betaalt tijdens online registratie; toegang pas definitief na betaling
  - Organisator ziet betaalstatus per speler (betaald / openstaand / kwijtschelding)
  - Automatische herinnering bij openstaande betaling (via US-ORG-16)
  - Kosteloos annuleren tot X uur voor start; terugbetaling geregeld
  - Geen betaling nodig voor gratis toernooien (USD 0 werkt naadloos)
- **Opmerkingen:**
  - Parity met Parrow events editie (€99/tournament) en Stripe/Mollie integratie
  - Ons platform is gratis; betaling is alleen voor de organisator richting deelnemers
  - OpenTour houdt geen commissie op betalingen

---

### US-ORG-19 — Extra spelvormen (Texas Scramble, Greensome, fourball)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik ook Texas Scramble, Greensome (stableford), fourball en andere teamformats kan kiezen
- **Waarde:** Ik kan alle gangbare wedstrijdvormen organiseren, niet alleen individuele stroke/stableford
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-ORG-01, US-ORG-03
- **Acceptatiecriteria:**
  - Extra formats bij aanmaken: Texas Scramble, Greensome (stableford), fourball (better ball), foursome
  - Scoring-regels per format worden correct toegepast (bv. teamscore i.p.v. individueel)
  - Leaderboard past weergave aan per format (team-ranglijst, individueel binnen team)
  - Teamindeling via flights (bv. 2 teams per flight bij fourball)
- **Opmerkingen:**
  - Parrow ondersteunt deze formats al; essentieel om concurrerend te blijven
  - Niet in MVP — De Haenen pilot gebruikt alleen individuele stableford

---

### US-ORG-20 — Koppeling met baanbezetting (Teecontrol / API)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat starttijden van het toernooi automatisch worden gesynchroniseerd met de baanbezetting
- **Waarde:** De baan weet welke flights er zijn en conflicten met losse starttijden worden voorkomen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-ORG-04 (starttijden), externe API
- **Acceptatiecriteria:**
  - OpenTour kan starttijden exporteren naar Teecontrol of vergelijkbaar systeem
  - Baanbezetting blokkeert de tijdslots voor de toernooi-flights
  - Bij wijzigen van starttijden: synchronisatie wordt opnieuw gestuurd
  - Bij annuleren toernooi: tijdslots worden vrijgegeven
  - Werkt ook zonder koppeling (handmatige invoer blijft mogelijk)
- **Opmerkingen:**
  - Parrow synchroniseert met Teecontrol voor baanbezetting
  - Niet alle clubs gebruiken Teecontrol; koppeling optioneel via API-interface
  - Vereist API-documentatie en samenwerking met Teecontrol of alternatief

---

## Open vragen

| # | Vraag |
|---|---|
| ORG-O1 | Moeten spelers verplicht een e-mailadres hebben? (Voor nu: optioneel, alleen naam is verplicht.) |
| ORG-O2 | Automatisch afsluiten van toernooi wanneer alle spelers 18 holes hebben ingeleverd, of altijd handmatig? |
