# Epic 05 — Authenticatie en toegang

## Epic beschrijving

Hoe gebruikers inloggen en welke rechten ze hebben. Het platform onderscheidt drie rollen: organisator (volledig beheer), recorder (scores invoeren) en toeschouwer (anoniem). Recorders kunnen deelnemen zonder permanent account via tijdelijke toegangscodes.

## Rationale

Authenticatie moet laagdrempelig zijn (geen wachtwoordgedoe) maar ook veilig (bescherming tegen misbruik). De combinatie van magic links voor organisatoren en toegangscodes voor recorders biedt de beste balans tussen gebruiksgemak en veiligheid. Toeschouwers hebben helemaal geen authenticatie nodig — dat is een bewust ontwerpkeuze.

---

## User stories

### US-AUTH-01 — Organisator inloggen via magic link

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik kan inloggen met mijn e-mailadres via een eenmalige link (magic link)
- **Waarde:** Ik hoef geen wachtwoord te onthouden en ben veilig ingelogd
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** Supabase Auth configuratie
- **Acceptatiecriteria:**
  - Invoerveld voor e-mailadres op de inlogpagina
  - Na verzenden: bevestiging "Check je e-mail voor de inloglink"
  - Magic link is 24 uur geldig
  - Na klikken op link: gebruiker is ingelogd en doorgestuurd naar dashboard
  - Bij verlopen link: duidelijke melding met optie nieuwe link aan te vragen
  - JWT-token wordt automatisch ververst door Supabase
- **Opmerkingen:**
  - Magic link is de primaire inlogmethode voor organisatoren
  - Geen wachtwoord betekent geen wachtwoord-gerelateerde supportvragen

## Technische specificatie

**Componenten:** `LoginPage` (bestaand, `app/[locale]/login/page.tsx`), `AuthCallback` route handler (bestaand, `app/auth/callback/route.ts`), Supabase Auth (bestaand via `@supabase/ssr`)
**Data flow:** e-mail → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '.../auth/callback' } })` → Supabase stuurt magic link → gebruiker klikt → callback route handelt PKCE flow af (`exchangeCodeForSession`) → redirect naar `/nl/dashboard`
**API endpoints:** `POST /auth/v1/otp` (Supabase intern via `signInWithOtp`); `app/auth/callback/route.ts` voor PKCE callback
**Validatie:** e-mail moet geldig formaat zijn (`type="email"` input); magic link 24 uur geldig (Supabase default); rate limiting op OTP verzenden (Supabase managed)
**Staten:** Idle (email input + "Stuur inloglink" knop), Sent ("Check je e-mail" scherm met email-adres), Loading ("Versturen..."), Error (rood tekstveld)

**[DEV only]** Extra state: Dev-login knop (direct inloggen zonder e-mail, alleen met `NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK=true`)
**i18n keys:** `common.nav.login`, `common.nav.logout` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Magic link via Supabase `signInWithOtp` met `shouldCreateUser: true` (nieuwe gebruiker = automatisch profiel)
  - PKCE flow: `exchangeCodeForSession` in callback route
  - JWT sessie cookie via `@supabase/ssr` (httpOnly cookie, automatisch ververst)
  - Bij verlopen link: `?error=auth` redirect naar login met melding

---

### US-AUTH-02 — Recorder inloggen via toegangscode

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik kan inloggen met een 8-tekens code, zonder e-mailadres of wachtwoord
- **Waarde:** Ik ben binnen enkele seconden klaar om te scoren
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-09
- **Acceptatiecriteria:**
  - Invoerveld voor 8-tekens code op de inlogpagina (scoreer-app en website)
  - Code is hoofdletterongevoelig
  - Bij geldige code: direct toegang tot het toernooi (anonieme Supabase sessie)
  - Recorder ziet alle flights van het toernooi
  - Bij ongeldige code: foutmelding "Code niet herkend. Vraag een nieuwe code aan de wedstrijdcommissie."
  - Na 5 mislukte pogingen: 5 minuten blokkade voor IP-adres
  - Vervaltijd van code wordt getoond bij inloggen
- **Opmerkingen:**
  - Dit is de laagdrempeligste inlogmethode, specifiek voor de use case op de baan
  - Rate limiting voorkomt brute-force aanvallen
  - Humoristische foutmelding na blokkade: "Wow Dechambeau, iets rustiger oké?"

## Technische specificatie

**Componenten:** `AccessCodeLogin` (nog te bouwen, `components/scorer/AccessCodeLogin.tsx`), `POST /api/validate-code` route (bestaand, `apps/web/app/api/validate-code/route.ts`)
**Data flow:** 8-tekens code (hoofdletterongevoelig) → `POST /api/validate-code` → server zoekt in `access_codes` (code + is_active + expires_at) → bij success: httpOnly cookie `recorder_session` met session data → client redirect naar scorer app
**API endpoints:** `POST /api/validate-code` (bestaand) — gebruikt `SUPABASE_SERVICE_ROLE_KEY` voor directe REST fetch
**Validatie:** code is 8 chars na trim/UPPER; `is_active = true`; `expires_at > now()`; rate limiting: 5 pogingen/IP/5 min (Cloudflare WAF of edge middleware)
**Staten:** Idle (input veld, 8 karakters max), Loading (knop disabled + spinner), Success (cookie gezet + redirect naar `/nl/scorer/...`), Error ("Code ongeldig of verlopen"), Blocked ("Wow Dechambeau, iets rustiger oké?")
**i18n keys:** `scorer.access_code.enter`, `scorer.access_code.submit`, `scorer.access_code.valid_until`, `errors.code_invalid`, `errors.code_expired`, `errors.rate_limit` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Server-side validatie via directe REST call naar Supabase (geen typed client, voor simpliciteit)
  - Cookie `recorder_session` bevat JSON: `{ tournamentId, accessCodeId, expiresAt }` — httpOnly, secure, sameSite=strict
  - Rate limiting boundary: 5 failed attempts per IP per 5 minutes (nog te implementeren in edge middleware)
  - Recorder sessie duurt maximaal 24 uur (gelijk aan `expires_at` van de code)

---

### US-AUTH-03 — Google OAuth inloggen (optioneel)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik kan inloggen met mijn Google-account
- **Waarde:** Ik hoef geen apart account aan te maken en ben sneller ingelogd
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** Supabase Auth configuratie
- **Acceptatiecriteria:**
  - Google OAuth-knop op de inlogpagina
  - Na toestemming: gebruiker is ingelogd en doorgestuurd naar dashboard
  - Eerste keer: profiel wordt aangemaakt met role='organizer'
  - Terugkerende gebruiker: direct ingelogd
- **Opmerkingen:**
  - Optioneel naast magic link; geen verplichting
  - Later: Apple Sign In (vereist voor iOS App Store)

## Technische specificatie

**Componenten:** `LoginPage` (bestaand, `app/[locale]/login/page.tsx` — Google OAuth knop toevoegen), Supabase Auth (Google provider configuratie in Supabase dashboard)
**Data flow:** Google OAuth knop → `supabase.auth.signInWithOAuth({ provider: 'google' })` → Supabase redirect naar Google consent → callback naar `/auth/callback` → PKCE flow → redirect naar dashboard
**API endpoints:** Supabase Auth OAuth endpoints (extern); `/auth/callback` route (bestaand) voor callback afhandeling
**Validatie:** Google OAuth configuratie in Supabase dashboard (Client ID + Secret); redirect URL's whitelisted
**Staten:** Idle (OAuth knop), Loading (OAuth popup/redirect), Error (Google login mislukt — fallback naar magic link)
**i18n keys:** `common.auth.google_login` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - OAuth knop op login pagina naast magic link input
  - Eerste keer: Supabase Auth callback triggert `supabase.auth.signInWithOAuth` waarna profiel wordt aangemaakt
  - `profiles.role` wordt ingesteld op `'organizer'` voor nieuwe Google OAuth gebruikers (via database trigger of edge function)
  - Terugkerende gebruiker: `handleAuthCallback` leidt naar dashboard

---

### US-AUTH-04 — Toegangscode deactiveren

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een toegangscode kan deactiveren, ook voor de vervaldatum
- **Waarde:** Ik behoud controle als een code verloren raakt of wordt misbruikt
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-AUTH-02
- **Acceptatiecriteria:**
  - Overzicht van alle actieve codes per toernooi
  - Knop "Deactiveer" per code
  - Na deactivering: code is onbruikbaar, ook als deze nog niet verlopen is
  - Gedeactiveerde code wordt grijs weergegeven in het overzicht
  - Organisator kan een nieuwe code aanmaken als vervanging
- **Opmerkingen:**
  - Essentieel voor veiligheid: een verloren code moet direct ongeldig gemaakt kunnen worden
  - Recorder met gedeactiveerde code ziet een melding bij de volgende inlogpoging

## Technische specificatie

**Componenten:** `ManageTournamentPage` (bestaand — tab "Toegangscodes" met deactiveer-knop per code), `AccessCodeList` (inline in manage page)
**Data flow:** Deactiveer-knop → `UPDATE access_codes SET is_active = false WHERE id = ...` via Supabase → `loadData()` herlaadt code lijst → code wordt grijs met "Gedeactiveerd" label
**API endpoints:** geen — directe Supabase update via `getSupabaseBrowser()`
**Validatie:** alleen codes van hetzelfde toernooi worden getoond (via RLS: `access_codes_select_own`); alleen `is_active = true` codes kunnen worden gedeactiveerd
**Staten:** Active (groen, "Kopieer" + "Deactiveer" knoppen), Gedeactiveerd (grijs, geen knoppen), Verlopen (grijs, "Verlopen" label)
**i18n keys:** `tournament.codes.deactivate` (nieuw — "Deactiveer"), `tournament.codes.deactivated` (nieuw — "Gedeactiveerd"), `tournament.codes.expired` (bestaand? — "Verlopen")
**Acceptatiecriteria uitgebreid:**
  - Overzicht toont alle codes voor het toernooi (actief, verlopen, gedeactiveerd)
  - Alleen actieve codes hebben de "Deactiveer" knop
  - Na deactivering: `UPDATE access_codes SET is_active = false` — code is onmiddellijk onbruikbaar
  - Recorder met gedeactiveerde code krijgt "Code ongeldig of verlopen" bij inlogpoging

---

### US-AUTH-05 — Organisator-dashboard

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een overzicht zie van al mijn toernooien nadat ik ben ingelogd
- **Waarde:** Ik heb snel toegang tot al mijn toernooien vanaf een centrale plek
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-AUTH-01
- **Acceptatiecriteria:**
  - Dashboard toont lijst van toernooien met: naam, datum, status, aantal spelers
  - Toernooien zijn gesorteerd op datum (nieuwste eerst)
  - Klikken op een toernooi opent het beheerscherm
  - Knop "Nieuw toernooi" voor het aanmaken van een nieuw toernooi
  - Duidelijke status-badges (concept, actief, gepauzeerd, afgesloten)
- **Opmerkingen:**
  - Dit is de thuisbasis voor de organisator
  - Later: filters, zoeken, statistieken op dashboard

## Technische specificatie

**Componenten:** `DashboardPage` (bestaand, `app/[locale]/dashboard/page.tsx`), `TournamentCard` (inline in dashboard — toernooi-kaart met naam, datum, status badge)
**Data flow:** `SELECT * FROM tournaments WHERE created_by = auth.uid() ORDER BY created_at DESC` via Supabase → toon lijst met status-badges
**API endpoints:** geen — directe Supabase query via `getSupabaseBrowser()`
**Validatie:** alleen toernooien van ingelogde organisator (via RLS: `tournaments_select_own`); redirect naar `/nl/login` als geen sessie
**Staten:** Loading ("Laden..."), Empty (dashed border + "Nog geen toernooien" + "Toernooi aanmaken" knop), Success (lijst van tournament cards met status badges), Unauthorized (redirect naar login)
**i18n keys:** `common.nav.dashboard`, `common.status.*` (bestaand), `tournament.status.*` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Dashboard checkt sessie via `supabase.auth.getSession()` en `onAuthStateChange` listener
  - Toernooien gesorteerd op `created_at DESC` (nieuwste eerst)
  - Status badges: Concept (grijs), Actief (groen), Gepauzeerd (geel), Afgelopen (blauw)
  - Klik op toernooi → `/nl/tournament/{id}/manage`
  - "Nieuw toernooi" knop → `/nl/tournament/new`

---

### US-AUTH-06 — Recorder permanent account (optioneel)

- **Rol:** Recorder (scorer) van een toernooi
- **Doel:** Dat ik optioneel een permanent account kan aanmaken met e-mail + magic link
- **Waarde:** Ik hoef bij volgende toernooien niet opnieuw een code in te voeren
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-AUTH-01
- **Acceptatiecriteria:**
  - Optie na inloggen via code: "Account aanmaken met dit e-mailadres"
  - Na aanmaken: e-mailadres gekoppeld aan recorder-profiel
  - Bij volgend toernooi: organisator kan recorder aan de deelnemerslijst toevoegen
  - Recorder ziet een overzicht van toernooien waaraan hij heeft deelgenomen
- **Opmerkingen:**
  - Niet in MVP; toegangscodes volstaan voor de pilot
  - Waardevol voor terugkerende spelers die hun scores willen bijhouden

---

### US-AUTH-07 — Meerdere organisatoren per toernooi

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik andere organisatoren kan toevoegen aan mijn toernooi, zodat zij ook beheer kunnen doen
- **Waarde:** We kunnen samen een toernooi beheren zonder accounts te delen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-AUTH-01
- **Acceptatiecriteria:**
  - Organisator kan andere gebruikers uitnodigen als mede-organisator
  - Mede-organisator heeft dezelfde rechten: beheer, scorecorrecties, codes
  - Originele organisator kan mede-organisatoren verwijderen
- **Opmerkingen:**
  - Eerstvalide: in MVP heeft een toernooi altijd 1 organisator
  - Later relevant voor clubaccounts met meerdere beheerders

---

### US-AUTH-08 — Uitloggen en sessiebeheer

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik kan uitloggen en mijn actieve sessies kan beheren
- **Waarde:** Ik behoud controle over mijn account, vooral bij gedeelde apparaten
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-AUTH-01
- **Acceptatiecriteria:**
  - Uitlogknop op dashboard en beheerscherm
  - Na uitloggen: sessie ongeldig, omleiding naar inlogpagina
  - Sessie verloopt automatisch na 7 dagen inactiviteit
  - Geen "ingelogd blijven" zonder expliciete actie
- **Opmerkingen:**
  - Essentieel voor gebruik op gedeelde laptops in het clubhuis
  - Supabase JWT handling met automatische verversing

## Technische specificatie

**Componenten:** `DashboardPage` (bestaand — uitlogknop in header, rechtsboven), `LoginPage` (bestaand — fallback na uitloggen)
**Data flow:** Uitlogknop → `supabase.auth.signOut()` → cookies worden verwijderd → redirect naar `/nl/login`
**API endpoints:** Supabase Auth logout endpoint (intern via `signOut()`); `/auth/logout` optioneel
**Validatie:** n.v.t. — uitloggen vereist geen validatie
**Staten:** Ingelogd (dashboard/beheer met uitlogknop), Uitloggen (loading), Uitgelogd (redirect naar login)
**i18n keys:** `common.nav.logout` (bestaand)
**Acceptatiecriteria uitgebreid:**
  - Uitlogknop op dashboard (`handleLogout` functie in `DashboardPage`)
  - `supabase.auth.signOut()` vernietigt sessie aan server-kant en verwijdert cookies
  - Sessie verloopt automatisch na 7 dagen inactiviteit (Supabase JWT default — configureerbaar in Supabase dashboard)
  - Geen "ingelogd blijven" checkbox — sessie wordt altijd gepersisteerd via cookie

---

## Overzicht rollen en rechten (MVP)

| Rol | Toegang | Authenticatie | Account nodig? |
|---|---|---|---|
| Organisator | Volledig beheer toernooi | Magic link of Google OAuth | Ja |
| Recorder | Scores invoeren voor alle flights | Toegangscode (8 tekens) of magic link | Nee (code volstaat) |
| Toeschouwer | Leaderboard bekijken | Geen | Nee |

---

## Open vragen

| # | Vraag |
|---|---|
| AUTH-O1 | Moet een organisator verplicht een e-mailadres opgeven, of volstaat een gebruikersnaam? (Voor nu: e-mail is verplicht voor magic link werking.) |
| AUTH-O2 | Hoe lang moet een sessie duren voor een recorder die via code inlogt? (Voor nu: zelfde duur als de code, max 24 uur.) |
