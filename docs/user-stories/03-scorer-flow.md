# Epic 03 — Scorer: score invoeren

## Epic beschrijving

De scoreer-app (PWA) waarmee recorders scores per hole invoeren, zowel online als offline. Dit is de meest kritieke gebruikerservaring van het platform: als score-invoer niet soepel werkt, faalt het hele toernooi.

## Rationale

Recorders gebruiken de app onder vaak lastige omstandigheden: buiten, in beweging, met mogelijk regen of felle zon, en met beperkt internetbereik. De app moet extreem eenvoudig, snel en betrouwbaar zijn. Elke extra stap of vertraging leidt tot frustratie en fouten.

---

## User stories

### US-SCR-01 — Inloggen via toegangscode

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik kan inloggen met een 8-tekens code, zonder dat ik een account hoef aan te maken
- **Waarde:** Ik ben direct binnen zonder registratie, wachtwoorden of e-mailbevestiging
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-09
- **Acceptatiecriteria:**
  - Invoerveld voor 8-tekens code (hoofdletterongevoelig)
  - Bij geldige code: direct toegang tot het toernooi
  - Bij ongeldige code: duidelijke foutmelding
  - Na 5 mislukte pogingen: 5 minuten blokkade voor dat IP
  - Code is maximaal 24 uur geldig
- **Opmerkingen:**
  - Dit is de laagdrempeligste manier van inloggen; essentieel voor adoptie
  - Magic link werkt ook voor recorders die wel een account hebben

## Technische specificatie

**Componenten:** `AccessCodeLogin` (nog te bouwen, `components/scorer/AccessCodeLogin.tsx` of onderdeel van scorer start page), `ScorerApp` shell (nog te bouwen, `app/[locale]/scorer/page.tsx`)
**Data flow:** 8-tekens code → `POST /api/validate-code` → server valideert in `access_codes` tabel → bij succes: httpOnly cookie `recorder_session` met `tournamentId`, `accessCodeId`, `expiresAt` → redirect naar scorer app
**API endpoints:** `POST /api/validate-code` (bestaand, `apps/web/app/api/validate-code/route.ts`)
**Validatie:** code is 8 tekens, hoofdletterongevoelig (ge-Uppered in API); code moet `is_active = true` en `expires_at > now()`; rate limiting: 5 mislukte pogingen per IP per 5 minuten (via Cloudflare Worker WAF)
**Staten:** Idle (code invoerveld met 8 karakters), Loading ("Valideren..."), Error ("Code ongeldig of verlopen"), Blocked ("Wow Dechambeau, iets rustiger oké?"), Success (redirect naar scorer app)
**i18n keys:** `scorer.access_code.enter`, `scorer.access_code.submit`, `scorer.access_code.validating` (nieuw), `errors.code_invalid`, `errors.code_expired`, `errors.rate_limit` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Invoerveld accepteert maximaal 8 karakters (automatisch hoofdletters via CSS `text-transform: uppercase` of client-side transform)
  - Code wordt geüppered en getrimd voor validatie
  - Bij 5 mislukte pogingen: IP wordt 5 minuten geblokkeerd (Edge middleware of Cloudflare WAF)
  - Vervaltijd wordt getoond bij geldige code (optioneel, voor UX)

---

### US-SCR-02 — Flight kiezen

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een flight kan kiezen waarvan ik de scores ga bijhouden
- **Waarde:** Ik zie alleen de spelers die relevant zijn voor mij
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-01, US-ORG-03
- **Acceptatiecriteria:**
  - Overzicht van alle flights met starttijd en spelers
  - Tikken op een flight opent de scorekaart voor die flight
  - Recorder kan tijdens het toernooi wisselen tussen flights
- **Opmerkingen:**
  - Een recorder kan alle flights van het toernooi zien, niet alleen de eigen flight
  - Dit is handig voor de wedstrijdcommissie die meerdere flights bijhoudt

## Technische specificatie

**Componenten:** `FlightSelector` (nog te bouwen, `components/scorer/FlightSelector.tsx`), `ScorerApp` shell (nog te bouwen, `app/[locale]/scorer/page.tsx`)
**Data flow:** `SELECT * FROM flights WHERE tournament_id = ...` via Supabase (via recorder session cookie); joins met `tournament_players` om aantal spelers per flight te tonen
**API endpoints:** geen — directe Supabase query via `getSupabaseBrowser()` (moet anon toegang hebben met geldige recorder_session cookie)
**Validatie:** recorder_session cookie moet geldig zijn (httpOnly, signed); tournament_id uit session wordt gebruikt voor query
**Staten:** Loading (flight cards skeleton), Empty ("Geen flights gevonden"), Error (retry), Success (lijst met flight cards: naam, starttijd, spelers)
**i18n keys:** `scorer.flight.select`, `scorer.flight.no_flights`, `scorer.flight.players_count` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Flight-selectie toont: flight naam, starttijd (HH:MM), aantal spelers, categorie
  - Tikken op flight → navigeer naar score invoer voor die flight
  - Recorder kan altijd terug naar flight-overzicht via "←" knop of tab
  - Geen restrictie op welke flights een recorder kan zien (alle flights van het toernooi)

---

### US-SCR-03 — Score per hole invoeren

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik per hole een score kan invoeren met grote +/- knoppen
- **Waarde:** Ik kan snel en zonder typefouten scores invullen, ook met handschoenen aan
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-02
- **Acceptatiecriteria:**
  - Per hole: par en hole-nummer worden getoond
  - Score-invoer via grote +/- knoppen (minimum 44px touch-target)
  - Na selecteren van score: direct opslaan en doorgaan naar volgende hole (US-SCR-08)
  - Huidige score is altijd zichtbaar en aanpasbaar
  - Hoge contrastkleuren en groot lettertype voor buitengebruik
- **Opmerkingen:**
  - Dit is de kern van de scoreer-ervaring
  - 18 holes moeten in minder dan 2 minuten ingevuld kunnen worden

## Technische specificatie

**Componenten:** `ScoreInput` (bestaand, `components/scorer/ScoreInput.tsx`), `HoleScoringPage` (nog te bouwen, pagina die ScoreInput laadt voor huidige flight), `HoleNavigator` (nog te bouwen — hole-overzicht met 18 holes status)
**Data flow:** `SELECT * FROM holes WHERE course_id = (SELECT course_id FROM tournaments WHERE id = ...)` of via loop → toon per hole: nummer, par, stroke index → scores worden lokaal opgeslagen in IndexedDB (offline-db.ts) en gesync via `upsert_score_if_newer` RPC
**API endpoints:** `supabase.rpc('upsert_score_if_newer', ...)` voor sync; `supabase.from('holes').select(...)` voor hole-data
**Validatie:** `strokes` BETWEEN 1 AND 99; `strokes` is integer; bij ≥10 (par 3), ≥11 (par 4), ≥12 (par 5): waarschuwingsdialoog
**Staten:** Loading (hole data ophalen), Input (grote +/- knoppen, score display), Warning (high-score dialoog), Saving (spinner/timeout), Saved (✅ badge per hole)
**i18n keys:** `scoring.hole`, `scoring.par`, `scoring.stroke_index`, `scoring.strokes`, `scoring.enter_score` (bestaand), `scoring.high_score_warning` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Touchdoelen minimaal 44px (globaal in `globals.css: button { min-height: 44px }`)
  - +/- knoppen 64×64px, rounded-full, met active scale-95 voor feedback
  - Score wordt direct opgeslagen na bevestiging (geen aparte save-knop nodig)
  - Label onder score toont relatieve score: Par, Birdie, Eagle 🦅, Bogey, Double, +N

---

### US-SCR-04 — Offline scores opslaan

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik scores kan invoeren ook wanneer ik geen internetverbinding heb
- **Waarde:** Ik kan gewoon doorscoren op afgelegen holes zonder bereik
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-03
- **Acceptatiecriteria:**
  - Scores worden lokaal opgeslagen in IndexedDB zodra offline
  - Geen merkbaar verschil in gebruikerservaring tussen online en offline
  - Alle functionaliteit blijft beschikbaar (flight kiezen, score invoeren, wijzigen)
  - Data gaat niet verloren bij sluiten van browser of tab
- **Opmerkingen:**
  - Dit is een van de belangrijkste onderscheidende kenmerken tov concurrenten
  - Zonder offline scoring is het platform niet bruikbaar op de meeste banen

## Technische specificatie

**Componenten:** `offline-db.ts` (bestaand, `lib/offline-db.ts` — Dexie IndexedDB wrapper), `SyncStatusBar` (bestaand, `components/scorer/SyncStatusBar.tsx`), `ScoreInput` (bestaand, gebruikt `saveScoreLocally()` in offline-modus)
**Data flow:** Scores → `saveScoreLocally()` → Dexie `pending_scores` table (IndexedDB) → bij online: `getPendingScores()` → `supabase.rpc('upsert_score_if_newer', ...)` per pending score → `markScoreSynced(localId)`
**API endpoints:** `supabase.rpc('upsert_score_if_newer', ...)` met parameters: `p_tournament_id, p_player_id, p_hole_id, p_round_number, p_strokes, p_updated_at`
**Validatie:** geen internet-check nodig — Dexie slaat altijd lokaal op; sync is apart proces; conflictresolutie: nieuwste `updated_at` wint (PostgreSQL functie `WHERE scores.updated_at < EXCLUDED.updated_at`)
**Staten:** Online/Synced (groen), Offline (geel — "Offline — scores bewaard"), Syncing (oranje — "Synchroniseren..."), Error (rood — "Fout bij sync — probeer opnieuw")
**i18n keys:** `scoring.sync.*` (bestaand — `synced`, `syncing`, `offline`, `error`)
**Acceptatiecriteria uitgebreid:**
  - Dexie database `opentour` met tabel `pending_scores`: `localId, tournament_id, player_id, hole_id, round_number, strokes, updated_at, synced, sync_error`
  - `saveScoreLocally()` genereert `localId` via `crypto.randomUUID()`, slaat op met `synced: false`
  - `getPendingScores()` haalt alle scores met `synced === 0` (niet gesynchroniseerd)
  - Data blijft bestaan bij tab-sluiten (IndexedDB persistentie)

---

### US-SCR-05 — Synchronisatiestatus zien

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik altijd kan zien of de app online of offline is en of mijn scores zijn gesynchroniseerd
- **Waarde:** Ik weet of mijn scores veilig zijn opgeslagen op de server
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-04
- **Acceptatiecriteria:**
  - Statusindicator altijd zichtbaar in de header van de scoreer-app
  - Statussen: online + gesynchroniseerd (groen), offline (geel), synchroniseren (oranje), fout (rood)
  - Bij synchronisatiefout: duidelijke melding met actie "Probeer opnieuw"
  - Scores met een ✅ badge zijn door de server bevestigd
- **Opmerkingen:**
  - Vertrouwen in de synchronisatie is cruciaal; recorders moeten niet twijfelen of hun scores zijn opgeslagen

## Technische specificatie

**Componenten:** `SyncStatusBar` (bestaand, `components/scorer/SyncStatusBar.tsx`), `ScorerApp` shell (nog te bouwen — toont SyncStatusBar in header)
**Data flow:** Network status (via `navigator.onLine` + `online`/`offline` event listeners) → sync state (pending scores count via `getPendingScores()`) → SyncStatusBar toont juiste status + aantal pending
**API endpoints:** geen — lokale statusbepaling (IndexedDB pending count + navigator.onLine)
**Validatie:** n.v.t. — alleen weergave
**Staten:** Synced (groen ✅, "Gesynchroniseerd"), Syncing (blauw 🔄, "Synchroniseren..."), Offline (geel 📴, "Offline — scores bewaard"), Error (rood ❌, "Fout bij sync — probeer opnieuw")
**i18n keys:** `scoring.sync.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - SyncStatusBar is altijd zichtbaar in de header van de scorer app
  - Pending count badge toont aantal niet-gesynchroniseerde scores (bijv. "3 wachtend")
  - Status update bij wijziging van netwerkstatus (online/offline events)
  - Error-status toont "Probeer opnieuw" knop die handmatige sync triggert

---

### US-SCR-06 — Automatische synchronisatie

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat mijn scores automatisch worden gesynchroniseerd zodra de verbinding terug is
- **Waarde:** Ik hoef niets handmatig te doen; het gebeurt vanzelf
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-04
- **Acceptatiecriteria:**
  - Bij herstel van internet: alle niet-gesynchroniseerde scores worden automatisch verzonden
  - Synchronisatie gebeurt op de achtergrond zonder gebruikersinteractie
  - Bij conflict: nieuwere `updated_at` wint (conditionele upsert)
  - Na synchronisatie: statusindicator wordt bijgewerkt naar "gesynchroniseerd"
  - Scores kunnen niet meer worden gesynchroniseerd nadat toernooi `finished` is
- **Opmerkingen:**
  - Conflictresolutie via PostgreSQL upsert_score_if_newer functie
  - Organisator kan altijd handmatig overschrijven

## Technische specificatie

**Componenten:** `syncScores` (nog te bouwen — sync-functie in `lib/sync-engine.ts` of geïntegreerd in `offline-db.ts`), `SyncStatusBar` (bestaand — toont sync status), Network event listeners (inline in scorer app)
**Data flow:** `online` event → `getPendingScores()` → for each: `supabase.rpc('upsert_score_if_newer', {...})` → success: `markScoreSynced(localId)` → error: `markSyncError(localId, message)` → update SyncStatusBar
**API endpoints:** `supabase.rpc('upsert_score_if_newer', ...)` (bestaand, migratie 003)
**Validatie:** alleen scores met `synced = false` worden gesync; `updated_at` conflictresolutie in PostgreSQL functie; scores kunnen niet worden gesync als toernooi `finished` is (check in sync logica)
**Staten:** Syncing (verzenden, oranje status), Gefaald per score (markSyncError, rood), Success (markScoreSynced, groen)
**i18n keys:** `scoring.sync.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Sync-engine luistert naar `window.addEventListener('online', syncPendingScores)`
  - Sync gebeurt sequentieel (één voor één) om race conditions te voorkomen
  - Bij conflict: PostgreSQL functie `upsert_score_if_newer` vergelijkt `updated_at` — nieuwste wint
  - Na `finished`: sync-engine voert niet uit (check `tournaments.status` voor sync)

---

### US-SCR-07 — Terug naar vorige hole om te corrigeren

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik terug kan gaan naar een eerder ingevulde hole om mijn score aan te passen
- **Waarde:** Ik kan typefouten herstellen zonder opnieuw te beginnen
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-03
- **Acceptatiecriteria:**
  - Visuele indicator van alle 18 holes met status (leeg, ingevuld, bevestigd)
  - Tikken op een hole-nummer opent die hole voor correctie
  - Na correctie: automatisch terug naar huidige hole
  - ✅ badge wordt tijdelijk vervangen door sync-status tot correctie is verwerkt
- **Opmerkingen:**
  - Voorkomt dat een kleine typefout leidt tot het opnieuw invullen van de hele ronde

## Technische specificatie

**Componenten:** `HoleNavigator` (nog te bouwen — horizontale scroll of grid met 18 holes, toont status per hole), `HoleScoringPage` (nog te bouwen — laadt ScoreInput voor geselecteerde hole)
**Data flow:** Lokale state (welke holes ingevuld zijn, uit IndexedDB of Supabase) → hole grid met statussen (leeg/ingevuld/bevestigd) → selecteer hole → laad ScoreInput met bestaande score
**API endpoints:** geen — lokale state + IndexedDB
**Validatie:** alleen holes 1-18 worden getoond; geselecteerde hole toont bestaande score (indien ingevuld)
**Staten:** Hole grid (18 vakjes met status), Selected hole (blauw omrand), Ingevulde hole (groen met ✅), Lege hole (grijs), Correctie (geel — tijdelijk tot volgende sync)
**i18n keys:** `scorer.hole_nav.grid`, `scorer.hole_nav.completed`, `scorer.hole_nav.empty` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Hole navigator toont alle 18 holes met: nummer, par, ingevulde score of placeholder
  - Tikken op hole-nummer opent ScoreInput voor die hole (bestaande score vooringevuld)
  - Na correctie en opslaan: terug naar huidige hole (of hole-overzicht)
  - ✅ badge wordt tijdelijk vervangen door sync-status tot correctie is verwerkt

---

### US-SCR-08 — Auto-advance naar volgende hole

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik na het opslaan van een score automatisch naar de volgende hole ga
- **Waarde:** Ik hoef niet na elke hole handmatig een volgend scherm te openen
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-03
- **Acceptatiecriteria:**
  - Na score-invoer + bevestiging: direct naar volgende hole
  - Op de volgende hole: par en vorige score zijn zichtbaar voor context
  - Na hole 18: bevestigingsscherm met samenvatting
  - Gebruiker kan altijd terug naar een overzichtsscherm
- **Opmerkingen:**
  - Dit is essentieel voor een soepele flow op de baan
  - Zonder auto-advance voelt de app traag en omslachtig

## Technische specificatie

**Componenten:** `HoleScoringPage` (nog te bouwen — beheert huidige hole index), `ScoreInput` (bestaand — `onSubmit` callback triggert auto-advance)
**Data flow:** `onSubmit(strokes)` → score opslaan (lokaal + sync) → `currentHoleIndex++` → laad volgende hole data (par, SI) → render ScoreInput voor nieuwe hole
**API endpoints:** geen — client-side state management
**Validatie:** als `currentHoleIndex >= totalHoles` (meestal 18): toon bevestigingsscherm (SCR-10) in plaats van volgende hole
**Staten:** Laatste hole (na hole 18: samenvatting i.p.v. volgende), Transition (korte animatie bij hole-wissel), Context zichtbaar (vorige score + hole info voor volgende hole)
**i18n keys:** `scorer.auto_advance.next_hole`, `scorer.auto_advance.finished` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Na score bevestigen (via ScoreInput `onSubmit`): direct naar volgende hole zonder extra klik
  - Op volgende hole: hole-nummer, par, stroke index, en vorige score zichtbaar
  - Bij hole 18: na submit → bevestigingsscherm (SCR-10) met "Definitief indienen"
  - Gebruiker kan altijd naar hole-overzicht via navigatie-knop

---

### US-SCR-09 — Holes-per-flight modus (wedstrijdcommissie)

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een hole kan kiezen en dan voor alle spelers in een flight de score kan invullen
- **Waarde:** De wedstrijdcommissie kan bij een tee alle flights bijhouden zonder mee te lopen
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-02
- **Acceptatiecriteria:**
  - Keuze bij start: "Meelopen met flight" of "Holes per flight invullen"
  - Bij "Holes per flight": selecteer hole → toon alle spelers van geselecteerde flight → voer scores in
  - Na opslaan: automatisch naar volgende flight of hole
  - Terug naar flight-selectiescherm mogelijk
- **Opmerkingen:**
  - Dit is een alternatieve workflow voor de wedstrijdcommissie op de eerste tee
  - Beide modi naast elkaar beschikbaar

## Technische specificatie

**Componenten:** `ScoringModeSelector` (nog te bouwen — keuze "Meelopen met flight" vs "Holes per flight"), `HolePerFlightView` (nog te bouwen — grid: spelers in flight als rijen, scores per hole)
**Data flow:** Selecteer hole → `SELECT tp.* FROM tournament_players tp WHERE tp.flight_id = ...` → toon alle spelers van geselecteerde flight → voer scores in → upsert per speler
**API endpoints:** geen — directe Supabase queries via `getSupabaseBrowser()`
**Validatie:** zelfde als score invoer (strokes 1-99); alle spelers in flight moeten een score hebben voor de geselecteerde hole
**Staten:** Mode select (twee knoppen: "Meelopen" / "Holes per flight"), Hole selection (kies hole 1-18), Player scores (per speler +/- knoppen), All entered (na laatste speler: auto-advance naar volgende flight/hole)
**i18n keys:** `scorer.mode.follow_flight`, `scorer.mode.holes_per_flight`, `scorer.hole_per_flight.select_hole`, `scorer.hole_per_flight.enter_all` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Bij start scorer app: keuze tussen twee modi
  - "Holes per flight": selecteer hole → toon alle spelers van geselecteerde flight met +/- knoppen
  - Na opslaan voor alle spelers: automatisch naar volgende hole of flight
  - Terug naar flight-selectie mogelijk via "←" knop

---

### US-SCR-10 — Bevestigingsstap voor definitief indienen

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een bevestigingsscherm zie voordat mijn scorekaart definitief wordt ingediend
- **Waarde:** Ik kan controleren of alle scores kloppen voordat ik ze definitief maak
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-08
- **Acceptatiecriteria:**
  - Na hole 18: samenvatting van alle scores per hole
  - Optie om terug te gaan naar een hole voor correctie
  - Knop "Definitief indienen" met extra bevestiging ("Weet je zeker dat alle scores kloppen?")
  - Na indienen: scores kunnen niet meer worden gewijzigd door recorder (alleen organisator)
  - Leaderboard wordt direct bijgewerkt
- **Opmerkingen:**
  - Voorkomt onbedoeld te vroeg indienen
  - Organisator kan altijd nog corrigeren (US-ORG-08)

## Technische specificatie

**Componenten:** `ScorecardSummary` (nog te bouwen — toont alle 18 scores per hole in een overzicht), `SubmitConfirmation` (nog te bouwen — dialoog met "Weet je zeker?" bevestiging)
**Data flow:** Alle lokale scores voor de flight → samenvatting per hole (hole#, par, strokes, stableford punten) → bij definitief indienen: `UPDATE scores SET is_verified = true` voor alle scores van deze speler
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** alle 18 holes moeten zijn ingevuld voordat indienen mogelijk is; na indienen: `is_verified = true` (recorder kan niet meer wijzigen)
**Staten:** Summary (overzicht van alle 18 holes), Incomplete (gemarkeerde lege holes met ⚠️), Confirmation modal ("Weet je zeker..."), Submitted (✅ "Scorekaart ingediend")
**i18n keys:** `scoring.submit.title`, `scoring.submit.confirm`, `scoring.submit.success` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Na hole 18: summary scherm met alle scores per hole (totaal slagen, stableford punten)
  - Optie om terug te gaan naar een hole voor correctie (via hole-navigator)
  - "Definitief indienen" knop met extra bevestigingsdialoog
  - Na indienen: `is_verified = true`, recorder kan niet meer wijzigen (UI checkt `is_verified`)

---

### US-SCR-11 — Waarschuwing bij ongebruikelijk hoge score

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een waarschuwing krijg als ik een ongebruikelijk hoge score invul
- **Waarde:** Typefouten worden opgemerkt voordat ze het leaderboard beinvloeden
- **Prioriteit:** C
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-03
- **Acceptatiecriteria:**
  - Waarschuwing bij score >= 10 op par 3, >= 11 op par 4, >= 12 op par 5
  - Waarschuwing is een dialoog: "Weet je zeker dat je X slagen hebt gespeeld op hole Y?"
  - Recorder kan bevestigen of annuleren
  - Geen blokkade; alleen een attentiewaarschuwing
- **Opmerkingen:**
  - Kleine moeite, groot effect op data-kwaliteit
  - Voorkomt dat een per ongeluk ingetypte "9" in plaats van "3" de uitslag verstoort

## Technische specificatie

**Componenten:** `ScoreInput` (bestaand — bevat `HIGH_SCORE_THRESHOLD` en `showWarning` state), `HighScoreWarning` (inline dialoog in ScoreInput)
**Data flow:** `strokes >= threshold` check bij `handleSubmit()` → `setShowWarning(true)` → modal met "Weet je zeker?" → `confirmHighScore()` of `cancel`
**API endpoints:** geen — client-side validatie
**Validatie:** `HIGH_SCORE_THRESHOLD = { 3: 10, 4: 11, 5: 12 }`; drempel gebaseerd op par van de hole; geen blokkade — alleen waarschuwing
**Staten:** Hidden (default), Warning visible (full-screen modal overlay), Confirmed (strokes wordt alsnog verzonden), Cancelled (terug naar ScoreInput)
**i18n keys:** `scoring.high_score_warning` (bestaand — "Weet je zeker dat dit de juiste score is?")
**Acceptatiecriteria uitgebreid:**
  - Waarschuwing bij strokes >= 10 op par 3, >= 11 op par 4, >= 12 op par 5
  - Dialoog met: "Je voert X slagen in op een par Y. Klopt dit?"
  - Twee knoppen: "Aanpassen" (terug naar input) en "Ja, klopt" (bevestig en submit)
  - Geen blokkade: recorder kan altijd doorgaan na bevestiging

---

### US-SCR-12 — Overzichtsscherm met alle holes

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een overzicht zie van alle 18 holes met mijn ingevoerde scores
- **Waarde:** Ik kan in een oogopslag zien welke holes ik al heb ingevuld
- **Prioriteit:** C
- **Fase:** Later
- **Afhankelijk van:** US-SCR-03
- **Acceptatiecriteria:**
  - Grid met alle 18 holes, nummer + par + ingevulde score
  - Niet-ingevulde holes zijn leeg of grijs
  - Tikken op een hole gaat naar die hole voor invoer of correctie
  - Totaal aantal slagen tot nu toe getoond
- **Opmerkingen:**
  - Handig voor pauze of bij twijfel
  - Voelt vertrouwd voor golfers die een fysieke scorekaart gewend zijn

---

### US-SCR-13 — Meerdere spelers in een flight tegelijk scoren

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik voor alle spelers in mijn flight de score kan invoeren op dezelfde hole
- **Waarde:** Ik hoef niet per speler een aparte scorekaart te openen
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-SCR-02
- **Acceptatiecriteria:**
  - Per hole: alle spelers in de flight worden getoond met +/- knoppen
  - Score voor alle spelers invoeren voordat je naar de volgende hole gaat
  - Eerder ingevoerde scores zijn zichtbaar en aanpasbaar
- **Opmerkingen:**
  - Dit is voor de speler die van zijn medespelers de scores bijhoudt
  - In MVP volstaat het scoren van alleen zichzelf

---

### US-SCR-14 — Eigen positie op leaderboard zien in scoreer-app

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik tijdens het scoren mijn eigen positie op het leaderboard kan zien
- **Waarde:** Ik hoef niet apart het leaderboard te openen om te zien waar ik sta
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SCR-03, US-SPE-04
- **Acceptatiecriteria:**
  - In de scoreer-app: knop of tab naar "Leaderboard" voor de eigen flight
  - Positie wordt real-time getoond zodra scores zijn gesynchroniseerd
  - Leaderboard in de app toont alleen de relevante context
  - Bij offline: laatst bekende positie tonen
- **Opmerkingen:**
  - Voorkomt dat recorders de leaderboard-URL apart moeten openen
  - Genoemd in §2.2 Recorder Later

---

### US-SCR-15 — Pushmeldingen voor starttijdherinnering en updates

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een pushmelding krijg als het toernooi start, gepauzeerd wordt, of als mijn starttijd nadert
- **Waarde:** Ik word proactief geïnformeerd en hoef de app niet continu te checken
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SCR-01, PWA-installatie
- **Acceptatiecriteria:**
  - Pushmelding bij: starttijd (30 min vooraf), toernooi gepauzeerd, toernooi hervat
  - Melding werkt ook als de app niet open is (service worker)
  - Toestemming gevraagd volgens browser-richtlijnen
  - Opt-out per notificatietype
- **Opmerkingen:**
  - Vereist Web Push API + VAPID-sleutels
  - Gebruiker moet de PWA hebben geïnstalleerd
  - Beperkte ondersteuning op iOS Safari

---

### US-SCR-16 — Persoonlijke statistieken over meerdere toernooien

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik mijn scores en statistieken kan terugzien over meerdere toernooien heen
- **Waarde:** Ik kan mijn vooruitgang volgen en prestaties vergelijken
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-ORG-17, US-AUTH-03
- **Acceptatiecriteria:**
  - Speler kan een account aanmaken en scores automatisch laten koppelen
  - Dashboard met: aantal toernooien, gemiddelde score, beste ronde, handicapverloop
  - Grafieken per toernooi (stableford punten, score to par)
  - Data wordt alleen getoond voor toernooien waar de speler aan heeft deelgenomen
- **Opmerkingen:**
  - Vereist een optioneel speler-account (niet in MVP, US-AUTH-03)
  - Privacy: speler kiest zelf of statistieken publiek of privé zijn

---

### US-SCR-17 — Smartwatch-ondersteuning

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik scores kan invoeren via mijn smartwatch
- **Waarde:** Ik hoef mijn telefoon niet uit mijn zak te halen tijdens het spelen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SCR-03, technische compatibiliteit
- **Acceptatiecriteria:**
  - Companion-app voor watchOS en Wear OS
  - Score-invoer met beperkte knoppen (hole +/-, score +/-)
  - Synchronisatie via telefoon (watch is alleen invoer, niet opslag)
  - Minimale weergave: huidige hole, par, score
- **Opmerkingen:**
  - Zeer niche; alleen waardevol als de core-app al volwassen is
  - Vereist native code (Swift, Kotlin) — niet voorzien in roadmap

---

### US-SCR-18 — QR-code scannen voor toegang tot toernooi

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik een QR-code kan scannen om direct toegang te krijgen tot het juiste toernooi en flight
- **Waarde:** Ik hoef geen code over te typen en kom direct in de juiste context
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SCR-01, US-SPE-09
- **Acceptatiecriteria:**
  - QR-code op het beheerscherm of geprint bij de inschrijftafel
  - Scannen opent de scoreer-app op de juiste flight
  - Werkt alleen voor actieve toernooien (status `active`)
  - Rate limiting: zelfde code mag maximaal 10x per minuut worden gescand
- **Opmerkingen:**
  - Gebruikt dezelfde QR als de leaderboard-URL (US-SPE-09) maar met redirect naar de scoreer-app
  - Genoemd in §2.2 Recorder Later

---

## Open vragen

| # | Vraag |
|---|---|
| SCR-O1 | Moet de PWA een installatieprompt tonen ("Voeg toe aan startscherm") of volstaat gebruik in de browser? |
| SCR-O2 | Wat is de minimale ondersteunde iOS-versie? PWA met Service Worker vereist iOS 14.3+. |
| SCR-O3 | Hoe omgaan met een recorder die per ongeluk de verkeerde flight selecteert? Correctie achteraf door organisator? |
