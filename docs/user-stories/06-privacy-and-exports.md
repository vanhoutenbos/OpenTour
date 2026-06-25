# Epic 06 — Privacy, AVG en exports

## Epic beschrijving

Privacy en data-controle zijn kernprincipes van OpenTour. Dit epic bevat alle stories rondom dataminimalisatie, AVG-rechten, anonimisatie, en data-export.

## Rationale

In een tijd van toenemend privacy-bewustzijn is AVG-compliance niet alleen een wettelijke verplichting maar ook een concurrentievoordeel. OpenTour verzamelt minimale data, geeft gebruikers volledige controle, en maakt data altijd exporteerbaar. Dit schept vertrouwen en onderscheidt het platform van gesloten concurrenten.

---

## User stories

### US-PRI-01 — Minimale dataverzameling bij aanmelding

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik bij het aanmelden van een speler alleen een naam hoef in te vullen; handicap en e-mail zijn optioneel
- **Waarde:** Ik verzamel niet meer data dan nodig is voor het toernooi
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-02
- **Acceptatiecriteria:**
  - Naam is het enige verplichte veld bij speler toevoegen
  - Handicap is optioneel
  - E-mail is optioneel
  - Geen verborgen velden, geen tracking-data
  - Privacy-opmerking bij het formulier: "We slaan alleen je naam en scores op voor dit toernooi"
- **Opmerkingen:**
  - Dit is de praktische uitwerking van het dataminimalisatieprincipe
  - Later: optionele extra velden zoals club, telefoon (alleen voor noodgevallen)

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Spelers" heeft formulier: naam + handicap + gender), spelers-formulier (inline op manage page)
**Data flow:** `INSERT INTO tournament_players (tournament_id, name, handicap, ...)` — alleen `name` en `tournament_id` zijn verplicht (database schema: `name TEXT NOT NULL`)
**API endpoints:** geen — directe Supabase insert via `getSupabaseBrowser()`
**Validatie:** `name` is verplicht (niet leeg); `handicap` optioneel met CHECK `BETWEEN -10 AND 54`; `email` optioneel (geen constraint); geen hidden fields of tracking
**Staten:** Formulier idle (input velden), Ingevuld (speler toegevoegd aan lijst), Privacy-notice (kleine tekst onder formulier)
**i18n keys:** `privacy.minimal_notice` (nieuw — "We slaan alleen je naam en scores op voor dit toernooi")
**Acceptatiecriteria uitgebreid:**
  - Formulier heeft alleen naam (verplicht), handicap (optioneel), gender (optioneel)
  - Geen e-mail veld in MVP (kan later optioneel worden toegevoegd)
  - Privacy-opmerking onder het formulier: "We slaan alleen je naam en scores op voor dit toernooi"
  - Geen verborgen form fields of tracking pixels

---

### US-PRI-02 — Naam zichtbaarheid beheren op leaderboard

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik per speler kan instellen of zijn volledige naam, initialen of een alias wordt getoond op het leaderboard
- **Waarde:** Spelers die privacy belangrijk vinden kunnen toch deelnemen
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-PRI-01
- **Acceptatiecriteria:**
  - Bij toevoegen speler: keuze voor weergavenaam (volledig, initialen, alias)
  - Standaard: volledige naam
  - Organisator kan de weergave achteraf wijzigen
  - Leaderboard toont de gekozen weergave
  - Exports gebruiken dezelfde weergave-instelling
- **Opmerkingen:**
  - Geeft spelers controle over hun zichtbaarheid
  - Voorkomt dat spelers afhaken vanwege privacybezwaren

## Technische specificatie

**Componenten:** `DisplayNameSelector` (nog te bouwen, `components/player/DisplayNameSelector.tsx` — dropdown bij speler toevoegen: volledig/initialen/alias), `LeaderboardTable` (bestaand — toont `player_name` uit view)
**Data flow:** Weergave-instelling opslaan in `tournament_players` tabel (nieuwe kolom `display_option` of aparte `display_name` kolom) → leaderboard view toont de gekozen weergave
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** `display_option` moet een van `'full' | 'initials' | 'alias'` zijn; default is `'full'`; alias is optioneel vrije tekst
**Staten:** Default (volledige naam), Initialen (bijv. "J. Jansen"), Alias (bijv. "De Slageraar")
**i18n keys:** `privacy.display.full`, `privacy.display.initials`, `privacy.display.alias`, `privacy.display.label` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Bij toevoegen speler: optionele weergave-instelling (dropdown met 3 opties)
  - Database: voeg kolom `display_option TEXT DEFAULT 'full'` toe aan `tournament_players` (of hergebruik bestaande `name` met aparte `display_name` kolom)
  - Leaderboard view moet de gekozen weergave respecteren (aanpassing nodig in view of client-side)
  - Exports gebruiken dezelfde weergave-instelling

---

### US-PRI-03 — Spelergegevens anonimiseren op verzoek

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een speler kan anonimiseren op zijn verzoek, zodat zijn naam wordt vervangen door een neutrale aanduiding
- **Waarde:** Ik voldoe aan het AVG-recht op verwijdering zonder de uitslag te wissen
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-PRI-02
- **Acceptatiecriteria:**
  - Knop "Anonimiseer" per speler op het beheerscherm
  - Na anonimiseren: naam vervangen door "Speler [ID]" of placeholder
  - Scores en uitslag blijven behouden (niet meer naar persoon te herleiden)
  - Leaderboard toont geanonimiseerde naam
  - Actie is onomkeerbaar (tenzij organisator handmatig een nieuwe naam invoert)
- **Opmerkingen:**
  - Dit vervult het AVG-recht op gegevensverwijdering (art. 17)
  - Scores moeten bewaard blijven voor de uitslag; anonimiseren is het juiste compromis

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Spelers", anonimiseer-knop per speler toevoegen), `AnonymizeConfirmDialog` (nog te bouwen — bevestigingsmodal "Weet je zeker dat je deze speler wilt anonimiseren?")
**Data flow:** "Anonimiseer" knop → `UPDATE tournament_players SET name = 'Speler [ID]' WHERE id = ...` via Supabase → leaderboard toont geanonimiseerde naam → actie is onomkeerbaar
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** alleen spelers in hetzelfde toernooi kunnen worden geanonimiseerd; naam wordt vervangen door placeholder; scores blijven bewaard
**Staten:** Default (volledige naam), Anonimized ("Speler [ID]"), Confirm dialog (modal met waarschuwing dat actie onomkeerbaar is)
**i18n keys:** `privacy.anonymize.title`, `privacy.anonymize.button`, `privacy.anonymize.confirm`, `privacy.anonymize.placeholder` (nieuw — "Speler {id}")
**Acceptatiecriteria uitgebreid:**
  - Knop "Anonimiseer" per speler op beheerscherm (alleen voor organisator)
  - Na anonimiseren: `name = 'Speler ' || substring(id::text, 1, 8)` (verkort UUID)
  - Scores, status, flight, en positie blijven behouden (alleen `name` wijzigt)
  - Leaderboard view toont `player_name` zoals opgeslagen in `tournament_players`
  - Actie is onomkeerbaar (geen undo — organisator kan handmatig nieuwe naam invoeren)

---

### US-PRI-04 — Account verwijderen met data-export

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik mijn account kan verwijderen, met een export van al mijn data vooraf
- **Waarde:** Ik heb volledige controle over mijn gegevens, ook als ik stop met het platform
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-PRI-07 (data-export)
- **Acceptatiecriteria:**
  - Optie "Account verwijderen" op profielpagina
  - Voor verwijdering: optie tot data-export
  - Na verwijdering: profiel ontkoppeld van toernooien
  - Toernooien blijven bestaan (eigendom van organisator was tijdelijk)
  - Bevestigingsstap met uitleg over wat er gebeurt
- **Opmerkingen:**
  - AVG-recht op vergetelheid (art. 17)
  - Toernooien kunnen niet verwijderd worden als ze andere spelers bevatten; alleen anonimiseren

---

### US-PRI-05 — Data exporteren als CSV

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik de uitslag en deelnemerslijst kan exporteren als CSV-bestand
- **Waarde:** Ik kan de data gebruiken in Excel, Google Sheets of andere systemen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-ORG-12
- **Acceptatiecriteria:**
  - Knop "Exporteer CSV" op beheerscherm en/of uitslagpagina
  - CSV bevat: positie, naam, totaal, score to par, handicap, flight, holes gespeeld
  - Optioneel: scores per hole als aparte kolommen
  - UTF-8 met BOM voor Excel-compatibiliteit
  - Bestandsnaam: [toernooinaam]-[datum].csv
  - Export binnen 5 seconden beschikbaar (ook bij grote toernooien)
- **Opmerkingen:**
  - CSV-export is de minimale export-functionaliteit; later ook PDF (US-PRM-02)
  - JSON is al beschikbaar via API in MVP (US-VS-02)

---

### US-PRI-06 — Privacyverklaring op website

- **Rol:** Bezoeker van de website
- **Doel:** Dat ik een duidelijke privacyverklaring kan lezen die uitlegt welke data wordt verzameld en waarom
- **Waarde:** Ik weet waar ik aan toe ben en kan een bewuste keuze maken
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** geen
- **Acceptatiecriteria:**
  - Privacyverklaring beschikbaar op URL /privacy
  - Verklaart: welke gegevens worden opgeslagen, waarom, hoe lang
  - Verklaart: rechten van gebruikers (inzage, correctie, verwijdering, export)
  - Verklaart: welke verwerkers worden gebruikt (Supabase, Vercel, Cloudflare)
  - Verklaart: dat er geen tracking-cookies of analytics zijn zonder toestemming
  - Verklaart: hoe self-hosting de privacy-verantwoordelijkheid verlegt
- **Opmerkingen:**
  - Dit is een AVG-vereiste
  - Taal: duidelijk Nederlands, geen juridisch jargon

## Technische specificatie

**Componenten:** `PrivacyPage` (nog te bouwen, `app/[locale]/privacy/page.tsx` — statische pagina met privacyverklaring)
**Data flow:** geen — statische content, geen data-ophaling
**API endpoints:** geen — statische pagina
**Validatie:** n.v.t.
**Staten:** n.v.t. — statische pagina
**i18n keys:** `privacy.page.title`, `privacy.page.last_updated` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Privacyverklaring beschikbaar op URL `/nl/privacy`
  - Verklaart: opgeslagen gegevens (naam, scores, handicap, sessie-token)
  - Verklaart: verwerkers (Supabase, Vercel, Cloudflare)
  - Verklaart: geen tracking-cookies, geen analytics zonder toestemming
  - Verklaart: gebruikersrechten (inzage, correctie, verwijdering via anonimisatie, export)
  - Verklaart: self-hosting optie en bijbehorende privacy-verantwoordelijkheid

---

### US-PRI-07 — Data-export via JSON (REST API)

- **Rol:** Ontwikkelaar of geavanceerde organisator
- **Doel:** Dat ik alle toernooi-data kan ophalen via een REST API in JSON-formaat
- **Waarde:** Ik kan de data programmatisch verwerken, migreren of integreren
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-12
- **Acceptatiecriteria:**
  - Endpoint: GET /api/tournaments/:id/leaderboard (JSON)
  - Endpoint: GET /api/tournaments/:id/players (JSON)
  - Endpoint: GET /api/tournaments/:id/scores (JSON)
  - Publieke data: geen authenticatie vereist
  - Response bevat alle relevante velden (namen, scores, posities, status)
  - Documentatie van de API beschikbaar
- **Opmerkingen:**
  - Dit is de minimale export-functionaliteit voor MVP
  - CSV-export via UI komt in fase 2 (US-PRI-05)
  - API is read-only in MVP; write-endpoints later

## Technische specificatie

**Componenten:** geen UI-component — REST API endpoints (nog te bouwen, `app/api/tournaments/[id]/leaderboard/route.ts`, `app/api/tournaments/[id]/players/route.ts`, `app/api/tournaments/[id]/scores/route.ts`)
**Data flow:** Request → API route → Supabase REST query → JSON response
**API endpoints:**
  - `GET /api/tournaments/:id/leaderboard` → `tournament_leaderboard` view (geordend op position)
  - `GET /api/tournaments/:id/players` → `tournament_players` (alleen naam, handicap, status, flight)
  - `GET /api/tournaments/:id/scores` → `scores` (gejoin met holes voor hole-nummer)
**Validatie:** tournament_id is UUID; 404 als niet bestaat of niet publiek; geen authenticatie vereist (publiek leesbaar via RLS)
**Staten:** 200 OK (JSON array), 404 Not Found (toernooi bestaat niet of niet publiek), 500 Error
**i18n keys:** geen — API responses zijn data-only
**Acceptatiecriteria uitgebreid:**
  - Endpoints zijn publiek (geen auth header nodig) — RLS staat SELECT toe voor anon op publieke toernooien
  - Response JSON bevat alle relevante velden (geen geneste structuur in MVP — platte array)
  - Leaderboard endpoint retourneert zelfde data als `tournament_leaderboard` view
  - API documentatie in `docs/api/README.md`

---

### US-PRI-08 — Bewaartermijn instellen per toernooi

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik kan instellen hoe lang de toernooi-data wordt bewaard na afloop
- **Waarde:** Ik bepaal zelf wanneer data wordt opgeruimd, conform mijn AVG-beleid
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Bij aanmaken toernooi: optionele bewaartermijn (bijv. 6, 12 maanden, of permanent)
  - Standaard: 12 maanden na einddatum
  - Na termijn: optionele herinnering aan organisator om te verlengen of te archiveren
  - Na termijn zonder actie: automatisch anonimiseren van spelersnamen
- **Opmerkingen:**
  - Automatische anonimisatie is veiliger dan automatische verwijdering
  - Uitslagen blijven bewaard (geanonimiseerd), tenzij organisator kiest voor volledige verwijdering

---

### US-PRI-09 — Cookie-toestemming (indien nodig)

- **Rol:** Bezoeker van de website
- **Doel:** Dat ik toestemming kan geven voor het gebruik van cookies
- **Waarde:** Ik bepaal zelf of ik tracking-cookies accepteer
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** geen (MVP gebruikt geen tracking-cookies)
- **Acceptatiecriteria:**
  - Alleen getoond als er niet-functionele cookies worden gebruikt
  - In MVP: geen tracking-cookies, dus geen cookie-banner nodig
  - Cookiemelding voldoet aan AVG-eisen (toestemming voor niet-functioneel)
- **Opmerkingen:**
  - MVP gebruikt alleen functionele cookies (Supabase sessie-token)
  - Cookie-banner alleen nodig als later analytics of advertenties worden toegevoegd

## Technische specificatie

**Componenten:** `CookieConsentBanner` (nog te bouwen, optioneel — alleen als niet-functionele cookies worden toegevoegd)
**Data flow:** n.v.t. — MVP gebruikt geen tracking-cookies; alleen functionele Supabase sessie-cookie (httpOnly, sameSite=strict)
**API endpoints:** n.v.t.
**Validatie:** cookie-banner toont alleen toestemmingsvraag voor niet-functionele cookies
**Staten:** Hidden (geen niet-functionele cookies actief — MVP), Visible (opt-in banner voor analytics — later)
**i18n keys:** `privacy.cookies.title`, `privacy.cookies.description`, `privacy.cookies.accept`, `privacy.cookies.decline` (nieuw, placeholder voor later)
**Acceptatiecriteria uitgebreid:**
  - MVP: geen cookie-banner nodig (alleen functionele cookies)
  - Supabase sessie-cookie is strikt functioneel (geen toestemming nodig onder AVG)
  - Cookie-banner wordt alleen geïmplementeerd als niet-functionele cookies (analytics, advertising) worden toegevoegd
  - Toestemming wordt opgeslagen in localStorage

---

## Open vragen

| # | Vraag |
|---|---|
| PRI-O1 | Moeten we een DPIA (Data Protection Impact Assessment) uitvoeren voor de pilot? (Aanbevolen, maar hangt af van de AVG-interpretatie van de pilotclub.) |
| PRI-O2 | Wat is de standaard bewaartermijn voor archiefdata? (Voor nu vastgesteld op 12 maanden, maar dit moet worden afgestemd met de pilotclub.) |
| PRI-O3 | Kunnen we de geanonimiseerde placeholder "Speler [ID]" vervangen door een golf-boy's naam generator voor de lol? (Open UI-vraag.) |
