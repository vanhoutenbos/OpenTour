# OpenTour — Design- en Productdocument

> **Status:** In ontwikkeling — levend document, versie 1.0  
> **Doel:** Centrale referentie voor alle product- en technische beslissingen.  
> **Onderscheid MVP vs. Later** is overal expliciet aangegeven.  
> Versiehistorie via Git. Aanvullingen direct hier verwerken.  
> **Documentatie-audit 2026-07-08:** dit document is gecontroleerd tegen de daadwerkelijke code en migraties in deze repo. Correcties zijn inline gemarkeerd. Uitgangspunt: het document mag dingen bevatten die nog niet gebouwd zijn (altijd duidelijk gelabeld als "gepland"/"Later"/"nog niet gebouwd"), maar de code mag nooit iets bevatten dat hier niet in staat.

---

## Inhoudsopgave

1. [Projectvisie en productmissie](#1-projectvisie-en-productmissie)
2. [Doelgroepen en use-cases](#2-doelgroepen-en-use-cases)
3. [Productmanifest](#3-productmanifest)
4. [MVP-scope](#4-mvp-scope)
5. [Privacy en AVG](#5-privacy-en-avg)
6. [Open data en standaarden](#6-open-data-en-standaarden)
7. [Technische architectuur op hoofdlijnen](#7-technische-architectuur-op-hoofdlijnen)
8. [Roadmap](#8-roadmap)
9. [Pilotplan — De Haenen toernooien](#9-pilotplan--de-haenen-toernooien)
10. [Concurrentieanalyse](#10-concurrentieanalyse)
11. [Risicoanalyse](#11-risicoanalyse)
12. [Monetisatie](#12-monetisatie)
13. [Open vragen en beslissingen](#13-open-vragen-en-beslissingen)
14. [Bijlagen](#14-bijlagen)

---

## 1. Projectvisie en productmissie

### Waarom dit product bestaat

Golftoernooien organiseren is in Nederland onnodig ingewikkeld en duur. Bestaande software is ofwel duur, gesloten, of slecht afgestemd op de Nederlandse markt. Clubs en verenigingen zijn overgeleverd aan Amerikaanse apps met dure abonnementen, verborgen betaalmuren, en geen zeggenschap over hun eigen data.

OpenTour lost dit op met een **gratis, open source platform** dat iedereen — van kleine club tot grote organisatie — in staat stelt professioneel uitziende toernooien te organiseren, zonder lock-in en zonder kosten voor de kernfunctionaliteit.

### Welk probleem het oplost

| Probleem | Oplossing |
|---|---|
| Betaalmuur voor basisfuncties (score invoeren, leaderboard) | Alle kernfuncties zijn en blijven gratis |
| App-installatie vereist voor score volgen | Leaderboard werkt in de browser, geen app nodig |
| Data zit vast in gesloten ecosystemen | Open data, export, API, self-hosting |
| Slechte ondersteuning Nederlandse banen en taal | NL-first: banen, taal, community |
| Geen offline scoring op de baan | PWA met offline-first, synchroniseert automatisch |
| Onduidelijke privacy bij publieke leaderboards | AVG-by-design, anonieme toegang, exporteerbaar |

### Kernprincipes

- **Gratis is echt gratis.** Geen verborgen betaalmuren, geen deelnemerslimiet. De AGPL-software zelf blijft altijd gratis en open source.
- **Open source (AGPL-3.0).** Iedereen mag het gebruiken, aanpassen en zelf hosten. Verbeteringen moeten terugvloeien naar het project.
- **Open data, geen lock-in.** Alle data is exporteerbaar in open standaarden (CSV, JSON, API). Data-eigenaarschap ligt bij de gebruiker.
- **Offline-first.** Golfbanen hebben slecht bereik; de score-app werkt altijd, ook zonder internet.
- **Eenvoud boven volledigheid.** Eén ding perfect is beter dan tien dingen halfslachtig.
- **Privacy-by-design.** Minimale dataverzameling, functionele cookies alleen, geen tracking.
- **Mobile-first, alle schermen.** Van telefoon in de broekzak tot 4K-TV in het clubhuis.
- **NL en EN vanaf dag 1.** Meer talen later via community.

### Waarom open source en open data

- **Vertrouwen:** Clubs en spelers zien exact wat er met hun data gebeurt. Geen black box.
- **Controle:** Data-eigenaarschap blijft bij de organisator. Altijd exporteerbaar, altijd migreerbaar.
- **Geen vendor lock-in:** Als de beheerde dienst stopt of te duur wordt, draait de club gewoon door op eigen infrastructuur.
- **Community:** Andere clubs, ontwikkelaars en golfbonden kunnen bijdragen, verbeteren en uitbreiden.

### Waarom data altijd exporteerbaar moet zijn

- Wettelijke verplichting (AVG/GDPR): gebruikers hebben recht op data-overdraagbaarheid.
- Een club moet kunnen overstappen naar een ander platform zonder dataverlies.
- Historische uitslagen en statistieken zijn waardevol; ze mogen niet verloren gaan bij het stopzetten van een dienst.
- Open formaten als CSV en JSON zijn vendor-onafhankelijk en leesbaar in elk gangbaar programma.

### Onderscheidend vermogen

| Aspect | OpenTour | Concurrenten |
|---|---|---|
| Prijs | Volledig gratis | Betaalmuur of abonnement |
| Open source | Ja (AGPL-3.0) | Nee, gesloten |
| Self-hosting | Altijd mogelijk | Nooit |
| Data-eigenaarschap | Gebruiker, exporteerbaar | Platform |
| Leaderboard zonder account | Ja, deelbare link | Vaak app/account nodig |
| NL-first | Ja | Nee, vaak Engels |
| Offline scoring | Ja (PWA) | Wisselend |
| Privacy-by-design | Ja, geen tracking | Cookies, analytics |

---

## 2. Doelgroepen en use-cases

### 2.1 Toernooiorganisator

**Wie:** Clubsecretaris, wedstrijdcommissie, evenementencoördinator, enthousiast clubild dat toernooien regelt.

**Pain points:**
- Moet nu handmatig flights indelen, scores bijhouden in Excel, uitslagen handmatig publiceren
- Bestaande software is te duur voor kleine clubs, te complex voor incidenteel gebruik
- Leden klagen over onduidelijke starttijden en leaderboards die niet werken
- Privacyregels zijn onduidelijk; wie mag welke naam zien op een leaderboard?

**MVP:**
- Snel een toernooi aanmaken (naam, datum, baan, format in 5 minuten)
- Spelers toevoegen via handmatige invoer
- Flights automatisch genereren, handmatig aanpasbaar
- Toegangscodes (8 tekens) genereren voor recorders
- Scores live volgen via leaderboard
- Scorecorrecties uitvoeren
- Toernooi pauzeren (met reden) en afsluiten

**Later:**
- E-mailcommunicatie naar deelnemers
- Toernooitemplates voor terugkerende evenementen
- Seizoensranglijsten en clubstatistieken
- White-label leaderboard met eigen branding
- Sponsorblokken en custom styling

### 2.2 Recorder / Scorer

**Wie:** De speler zelf of een aangewezen scorer per flight. Ook de wedstrijdcommissie die bij de eerste tee alle flights noteert.

**Pain points:**
- Onregelmatig bereik op de baan; scores raken kwijt bij uitval
- Moet omslachtig inloggen met wachtwoord terwijl je buiten staat
- Papieren scorekaart moet later nog worden overgetypt
- Onoverzichtelijke interface met te kleine knoppen

**MVP:**
- Inloggen via 8-tekens code, geen permanent account nodig
- Scores offline invoeren, automatisch synchroniseren bij verbinding
- Grote +/- knoppen voor snelle invoer (18 holes in <2 minuten)
- Auto-advance naar volgende hole na opslaan
- Duidelijke sync-status (online/offline/error)
- Drie modi: meelopen met flight, holes-per-flight invullen, of grid-weergave (meerdere spelers naast elkaar, tot 4 kolommen)

**Later:**
- Eigen positie op leaderboard zien vanuit de app
- Pushmeldingen (starttijdherinnering, toernooiupdates)
- Persoonlijke statistieken over meerdere toernooien
- Smartwatch-ondersteuning
- QR-code scannen voor toegang

### 2.3 Toeschouwer / Volger

**Wie:** Familie, clubleden, supporters, sponsoren die het verloop willen volgen.

**Pain points:**
- Wil snel de stand zien maar geen app installeren of account aanmaken
- Onduidelijk waar het leaderboard te vinden is
- Onleesbaar op telefoon of te klein op TV in het clubhuis

**MVP:**
- Leaderboard bekijken zonder account of app, via deelbare link
- Werkt op telefoon, laptop, TV, projector — volledig responsive
- Automatische updates elke 30 seconden
- Pauzebanner bij onderbroken toernooi (met reden)
- Spelerstatus (DNS/DNF/DSQ) duidelijk zichtbaar

**Later:**
- Specifieke speler volgen met notificaties
- Kiosk-modus voor groot scherm
- Flight-filter en spelerzoeker
- Sociale functies (delen, reageren)

### 2.4 Clubbeheerder (Later — uitbreidingspad)

**Wie:** Bestuurslid of clubmanager die meerdere toernooien, leden en seizoenen wil beheren.

**Pain points (later):**
- Geen centraal overzicht van alle clubtoernooien
- Leden verwachten een doorlopende ranglijst
- Wil sponsorruimte kunnen verkopen

**Later (niet in MVP):**
- Meerdere organisatoren per club
- Seizoensoverzicht en clubranglijsten
- Club-branding op leaderboard en uitslagen
- Sponsorbeheer

---

## 3. Productmanifest

### Missie

Het eenvoudig maken voor iedere golfer en club om professionele toernooien te organiseren, zonder kosten, zonder lock-in, met volledige controle over eigen data.

### Doelgroep

Golfverenigingen, clubsecretarissen, wedstrijdcommissies, spelers en supporters — met focus op de Nederlandse markt als startpunt.

### Kernbelofte

> OpenTour is en blijft gratis voor alle kernfuncties. Je data is van jou. Je kunt altijd exporteren, migreren of zelf hosten.

### Productprincipes

1. **Eenvoud wint.** Liever vijf knoppen die perfect werken dan vijftig die verwarren.
2. **Offline is geen uitzondering, het is de norm.** De score-app werkt altijd, overal.
3. **Geen account nodig voor kijken.** Leaderboard is publiek toegankelijk via een link.
4. **Privacy-by-default.** Minder data vragen dan nodig. Altijd uitleggen waarom iets gevraagd wordt.
5. **Rolgericht ontwerpen.** Organisator, recorder en toeschouwer krijgen elk hun optimale interface.
6. **Open standaarden.** CSV, JSON, REST API. Geen proprietaire formaten.
7. **Community-gedreven groei.** Features worden bepaald door echte gebruikers, niet door aandeelhouders.

### Besluit over banenbeheer

- Een organisator mag nu meerdere banen aanmaken en beheren.
- Alleen de eigenaar van een baan mag deze bewerken.
- Publicatie naar andere organisatoren of de wereld is een latere submit/review-flow, niet onderdeel van de MVP.
- Bestaande banen worden toegewezen aan één eigenaar zodat het huidige beheer eenduidig blijft.

### Non-goals

| Niet doen | Waarom niet |
|---|---|
| Ledenbeheer | Clubs hebben daar al systemen voor. Wij doen toernooien. |
| Handicapbeheer via NGF-koppeling in MVP | Vereist toestemming NGF; handmatige invoer volstaat. |
| Volledige clubwebsite | Focus op toernooi-functionaliteit. |
| Betalingsverwerking in MVP | Pas nodig bij premium features. |
| Native app in MVP | PWA volstaat; native app later als er vraag is. |
| Sociale feed / community platform | Wordt golf-specifiek social platform, niet de focus. |
| GPS / afstandsmeter | Vereist native API's; later als uitbreiding. |

### Privacyprincipes

- Verzamel alleen data die noodzakelijk is voor de functionaliteit.
- Data wordt alleen bewaard zolang nodig voor het toernooi, tenzij expliciet anders (archief uitslagen).
- Geen tracking, geen analytische cookies, geen profilering.
- Gebruikers hebben recht op inzage, correctie, export en verwijdering.
- Anonieme toegang voor toeschouwers — geen cookies of persoonsgegevens.

### Open dataprincipes

- Alle data is exporteerbaar in CSV en JSON, met of zonder API.
- Baangegevens zijn open beschikbaar (CC0 waar mogelijk).
- Scores en uitslagen kunnen als open data gepubliceerd worden (mits toestemming deelnemers).
- Geen proprietaire formaten; data is altijd leesbaar in gangbare tools.
- API is RESTful, gedocumenteerd, en vrij toegankelijk voor niet-commercieel gebruik.

### Monetisatieprincipes

- **De gratis kern blijft gratis.** Dit is niet onderhandelbaar.
- Premium features mogen nooit basisfunctionaliteit afnemen die eerst gratis was.
- Premium is voor organisatoren (branding, exports, hosting), niet voor spelers.
- Self-hosting blijft altijd volledig gratis.
- Inkomsten zijn bedoeld om hostingkosten te dekken, niet om winst te maximaliseren.

### Succescriteria

| Criterium | Doel (12 maanden na launch) |
|---|---|
| Aantal aangemaakte toernooien | 100+ |
| Actieve organisatoren | 20+ |
| Unieke leaderboard bezoekers | 2.000+ |
| Scores ingevoerd | 25.000+ |
| GitHub stars | 200+ |
| Externe contributors | 5+ |
| Self-hosting installaties | 10+ |
| Tevredenheid pilotclub | NPS >= 40 |

---

## 4. MVP-scope

### 4.1 Absoluut noodzakelijk voor MVP

**Toernooi beheer:**
- Toernooi aanmaken met naam, datum, baan, format (stroke/stableford/match)
- Baanconfiguratie: aanmaken van holes met par en stroke index
- Bestaande baan kiezen uit database (o.a. eGolf4u-import)
- Meerdere tees per baan (bijv. geel/rood/wit), elk met eigen par/SI/afstand, en optioneel WHS slope- en course-rating (playing-handicap-formule daarop nog niet doorgekoppeld naar scoring)
- Baanconfiguratie wordt bevroren op het moment dat een toernooi start (snapshot), zodat latere wijzigingen aan de baan lopende/afgeronde toernooien niet beïnvloeden
- Een organisator beheert alleen zijn eigen banen; banen zijn standaard privé (zie "Besluit over banenbeheer" in sectie 3)
- Spelers toevoegen: handmatig, met naam als enige verplicht veld en optioneel handicap, geslacht, geboortedatum, adres, telefoon en NGF-nummer (zie de correctie in §5.2)
- Spelerscategorieën (bijv. op handicap of geslacht) aanmaken en spelers daaraan koppelen, met optie om flights per categorie te genereren
- Flights aanmaken: automatisch genereren + handmatig aanpassen (drag-and-drop)
- Starttijden per flight instellen
- Toernooien met meerdere rondes (2 t/m 99), met per-ronde scores en een per-ronde leaderboard-subtotaal
- Matchplay pairings automatisch genereren binnen een flight (round-aware)
- Statustransities: draft, active, paused, finished (alle omkeerbaar)
- Pauzeren met reden (weergegeven op leaderboard)
- Speler markeren als DNS, DNF of DSQ
- Scorecorrecties uitvoeren door organisator
- Toegangscodes (8 tekens) genereren, standaard vervallen na 24 uur (optioneel zonder vervaldatum op databaseniveau, UI-optie hiervoor nog niet gebouwd), deactiveren

**Score invoeren:**
- Inloggen via 8-tekens code of magic link
- Score invoeren per hole via +/- knoppen
- Offline scores lokaal opslaan (IndexedDB)
- Automatische synchronisatie bij verbinding
- UI-status: online/offline/sync
- Auto-advance naar volgende hole
- Bevestigingsstap voor definitief indienen
- Drie modi: meelopen met flight, holes-per-flight invullen, of grid-weergave (meerdere spelers naast elkaar)

**Leaderboard:**
- Publiek zichtbaar via URL, geen account vereist
- Responsive: telefoon (360px) tot 4K-TV
- Automatische update via polling (30 sec)
- Scores, positie, holes gespeeld, flight-naam
- Spelerstatus (DNS/DNF/DSQ) onderaan ranglijst
- Pauzebanner met reden bij gepauzeerd toernooi
- Matchplay-weergave (hole-by-hole stand per pairing) voor toernooien met format `match`
- Flight-filter en spelerzoeker
- Favoriete spelers markeren (lokaal opgeslagen in de browser, max. 5, nooit naar de server verstuurd)
- Rondeselectie en per-ronde subtotalen bij meerdaagse toernooien

**Authenticatie:**
- Magic link voor organisatoren
- Toegangscodes voor recorders (8 tekens, 24 uur geldig)
- Rate limiting: 5 mislukte pogingen per 5 minuten
- Google OAuth (optioneel, S-prioriteit)

**Exports:**
- Leaderboard data beschikbaar als JSON (via API)

**Privacy:**
- Geen tracking, geen analytics zonder toestemming
- Alleen functionele cookies
- Privacyverklaring beschikbaar

### 4.2 Handig maar later

- CSV-import van spelers
- QR-code genereren voor leaderboard-URL
- CSV/PDF export van uitslagen
- E-mailnotificaties naar deelnemers
- Kiosk-modus leaderboard

> **Correctie (documentatie-audit 2026-07-08):** deze lijst bevatte eerder ook drag-and-drop flight-aanpassing, de matchplay-weergave, meerdaagse toernooien, flight-filter op het leaderboard en EN-vertaling — die vijf zijn inmiddels allemaal gebouwd en zijn verplaatst naar §4.1. Twee dingen die niet in de MVP-scope stonden zijn er ondertussen ook bij gekomen zonder specifieke planning: een licht/donker/systeem-thema en een lokale "favorieten"-markering op het leaderboard (zie §4.1).

### 4.3 Premium / later monetiseerbaar

- White-label leaderboard (eigen logo, kleuren, domein)
- Uitgebreide exports (PDF-scorecards, statistieken)
- Sponsorblokken op leaderboard
- Beheerde hosting voor clubs
- Prioriteitsondersteuning
- Extra analytics en clubstatistieken

---

## 5. Privacy en AVG

### 5.1 Uitgangspunt

OpenTour verwerkt persoonsgegevens omdat toernooien nu eenmaal spelersnamen en scores vereisen. Het principe is: **minimaal noodzakelijk, transparant, en onder controle van de gebruiker.**

### 5.2 Welke gegevens we opslaan

| Gegeven | Doel | Bewaartermijn | Verplicht? |
|---|---|---|---|
| E-mailadres organisator | Authenticatie (magic link) | Zolang account actief | Ja, voor organisator |
| Naam speler/recorder | Scorekaart, leaderboard | Duur toernooi + archief uitslag | Ja |
| Handicap | Net scoring-berekening | Duur toernooi | Nee (optioneel) |
| Geslacht, geboortedatum, adres, telefoon, NGF-nummer | Wedstrijdadministratie, mogelijke toekomstige NGF-export | Duur toernooi | Nee (optioneel, invoerbaar door organisator) |
| Scores per hole | Leaderboard, uitslag | Permanent (archief) | Ja |
| Toegangscode | Authenticatie recorder | Tot vervaldatum (standaard 24 uur, optioneel langer) | Ja |
| IP-adres | Rate limiting, foutopsporing | 30 dagen max | Automatisch |
| E-mail recorder | Optionele accountkoppeling | Zolang account actief | Nee |
| Favoriete spelers (toeschouwer) | Persoonlijke filter op het leaderboard | Lokaal in de browser (localStorage), nooit naar de server | Nee |

**Wat we niet opslaan:** locatiegegevens (GPS), browsergeschiedenis, betalingsgegevens.

> **Correctie (documentatie-audit 2026-07-08):** een eerdere versie van dit document stelde dat geslacht, telefoonnummer, leeftijd en adres niet worden opgeslagen. Sinds de uitgebreide spelervelden (voor wedstrijdadministratie/NGF-doeleinden) is dat niet meer juist — deze velden zijn optioneel invoerbaar door de organisator. Zie ook open vraag ORG-O3 in `docs/user-stories/02-organizer-flow.md`: moeten deze velden standaard verborgen zijn (progressive disclosure) in plaats van standaard getoond, gezien het dataminimalisatie-principe hieronder?
>
> Ook is de toegangscode zelf **niet** gehashed in de database (in tegenstelling tot wat een eerdere versie van dit document stelde) — de code staat als leesbare tekst opgeslagen, omdat hij direct aan de organisator getoond en door de recorder ingetypt moet worden.

### 5.3 Privacy-by-design keuzes

**Geen ledenbeheer:** OpenTour slaat geen ledenbestanden op. Spelers worden per toernooi toegevoegd en zijn na afloop alleen zichtbaar in het archief.

**Anonieme toegang voor toeschouwers:** Het leaderboard is publiek zonder account, zonder cookies, zonder tracking. De URL is deelbaar. Een toeschouwer laat geen spoor achter.

**Toegangscodes i.p.v. accounts voor recorders:** Een recorder heeft geen permanent account nodig. De 8-tekens code is tijdelijk (24 uur) en niet gekoppeld aan een identiteit tenzij de recorder zelf een account aanmaakt.

**Naam zichtbaarheid op leaderboard:**
- Standaard: volledige naam zichtbaar (toernooicontext)
- **Gepland, nog niet gebouwd:** organisator kan per speler kiezen: naam verbergen, initialen tonen, of alias gebruiken (zie US-PRI-03/04 in `docs/user-stories/06-privacy-and-exports.md`)
- **Gepland, nog niet gebouwd:** bij verzoek kan de organisator een naam (laten) anonimiseren
- Na toernooi: uitslag blijft als archief; het verwijderen/anonimiseren van namen achteraf is eveneens nog niet gebouwd

**Wanneer anonimiseren (gepland, zie US-PRI-03):**
- Op verzoek van de speler (AVG-recht op verwijdering)
- Na een door de organisator ingestelde bewaartermijn
- Bij verwijdering van het toernooi

**Gegevens verwijderen (gepland, nog niet gebouwd — zie epic 06 in `docs/user-stories/`):**
- Organisator verwijdert account: alle gekoppelde toernooien blijven bestaan, maar het profiel wordt ontkoppeld
- Speler vraagt verwijdering: naam wordt geanonimiseerd in alle toernooien, scores blijven maar zijn niet meer naar een persoon te herleiden
- Toernooi verwijderen: alle bijbehorende data wordt verwijderd

### 5.4 Praktische uitvoering (streefbeeld — nog niet volledig gebouwd)

- In het systeem: elke tournament_players-rij heeft een naamveld. Bij anonimisatie wordt de naam vervangen door een placeholder. **(Gepland — US-PRI-03 staat nog als "todo".)**
- In de database: geen CASCADE DELETE van spelers naar scores, zodat scores bewaard blijven bij anonimisatie. **(Dit deel klopt al met de huidige database-inrichting.)**
- In de UI: organisator ziet een knop "Anonimiseer" per speler of voor alle niet-actieve spelers na afloop. **(Nog niet gebouwd.)**
- In de API: een end-point die de naam vervangt door een hash. **(Nog niet gebouwd — er is momenteel ook geen publieke REST API buiten het leaderboard-endpoint, zie §6.3.)**
- Bewaartermijn: standaard wordt data 12 maanden na toernooi-einde bewaard, daarna optioneel anonimiseren door organisator. **(Beleidsvoornemen — nog niet technisch afgedwongen.)**

### 5.5 Verwerkersoverzicht

| Verwerker | Wat | Locatie |
|---|---|---|
| Supabase (cloud) | Database, auth, storage | AWS eu-west-1 (Ierland) |
| Vercel | Website + PWA hosting | Edge (EU-servers beschikbaar) |
| Cloudflare | CDN, Workers, rate limiting | Wereldwijd (EU-opties) |

Bij self-hosting bepaalt de hoster zelf de verwerkers en locaties.

---

## 6. Open data en standaarden

### 6.1 Waarom open data een kernvoordeel is

OpenTour onderscheidt zich door data niet op te sluiten in een propriëtair ecosysteem. Gebruikers moeten te allen tijde kunnen beschikken over hun data, zonder afhankelijkheid van het platform. Dit is zowel een ethisch als strategisch voordeel:

- **Vertrouwen:** Gebruikers weten dat hun data niet gegijzeld wordt.
- **Adoptie:** Clubs durven over te stappen omdat ze niet vastzitten.
- **Innovatie:** Andere ontwikkelaars kunnen op de data voortbouwen.
- **Toekomstbestendig:** Data gaat niet verloren als het project stopt.

### 6.2 Welke data exporteerbaar is

| Dataset | MVP | Later | Formaat |
|---|---|---|---|
| Deelnemerslijst | Via UI | Via UI + API | CSV, JSON |
| Scores per speler per hole | Via API | Via UI + API | CSV, JSON |
| Leaderboard / uitslag | Ja (JSON API) | PDF, CSV, JSON | CSV, JSON, PDF |
| Flights en starttijden | Via API | Via UI + API | CSV, JSON |
| Baangegevens | Via API | Via UI + API | CSV, JSON, (GEF) |
| Toernooiconfiguratie | Nee | Ja | JSON |

### 6.3 Standaardformaten

**CSV (MVP):**
- UTF-8 met BOM voor Excel-compatibiliteit
- Kolommen: positie, spelernaam, totaal, status, flight, holes gespeeld
- Optioneel: score per hole, handicap, net-score

**JSON (MVP):**
- Volledige leaderboard-response via API
- Alle toernooi-data in gestructureerd formaat
- Documentatie via OpenAPI/Swagger (later)

**REST API:**
- **Daadwerkelijk gebouwd (MVP):** `GET /api/leaderboard/:tournamentId` — gecachte leaderboard-data via de Cloudflare Worker (zie §7). Publiek, geen authenticatie nodig voor publieke toernooien.
- **Gepland, nog niet gebouwd:** losse REST-resources per entiteit (`/api/tournaments/:id/players`, `/api/tournaments/:id/scores`, `/api/tournaments/:id`), authenticatie via Supabase JWT voor niet-publieke data, en OpenAPI/Swagger-documentatie.
- Tot die tijd is de Supabase PostgREST auto-API (via de `anon key` en RLS) het feitelijke mechanisme waarmee de frontend data ophaalt buiten het leaderboard-endpoint om — dit is geen publiek gedocumenteerde API voor derden.

### 6.4 Aansluiting op golfstandaarden

| Standaard | Relevantie | Status |
|---|---|---|
| WHS (World Handicap System) | Net-scoring berekening | Vereenvoudigd in MVP |
| EGCO (European Golf Course Database) | Baangegevens | Te onderzoeken |
| GEF (Golf Data Format) | Data-uitwisseling tussen systemen | Later, na community-vraag |
| eGolf4u JSON | NL-baangegevens | Geïmporteerd in MVP |
| NGF (Nederlandse Golf Federatie) | Handicaps, leden | Later, met toestemming |

### 6.5 Data-eigenaarschap

- De organisator van een toernooi is data-eigenaar van dat toernooi.
- De organisator kan data exporteren, verwijderen of anonimiseren.
- OpenTour als platform claimt geen eigendom over gebruikersdata.
- Baangegevens uit open bronnen (eGolf4u) zijn beschikbaar onder de oorspronkelijke licentie.
- Bij beëindiging van de beheerde dienst krijgen alle gebruikers een export van hun data.

### 6.6 Waarom geen lock-in

- Self-hosting is altijd mogelijk met dezelfde codebase.
- Alle data is exporteerbaar in open formaten.
- Geen proprietaire API; alle endpoints zijn RESTful.
- Het datamodel is eenvoudig en gedocumenteerd.
- Gebruikers kunnen altijd overstappen naar een andere oplossing zonder dataverlies.

---

## 7. Technische architectuur op hoofdlijnen

### 7.1 Overzicht

Het platform bestaat uit drie hoofdcomponenten: een webfrontend (Next.js inclusief PWA), een cachelaag (Cloudflare Workers), en een backend (Supabase met PostgreSQL).

```
Frontend (Next.js op Vercel)
  - Website (landingspagina, beheer, dashboard)
  - Leaderboard (route /tournament/[id])
  - Scoreer-PWA (route /scorer, offline via IndexedDB)
    |
    |-- POST (scores) direct naar Supabase
    |-- GET (leaderboard, banen) via Cloudflare Worker (cache)
    |
    v                          v
Cloudflare Worker           Supabase (PostgreSQL + Auth + Storage)
  - Cache API (30s TTL)       - Database (courses, tournaments, scores)
  - Rate limiting              - Auth (magic link, OAuth)
  - Routing                    - Row Level Security
                               - Self-hostable via Docker
```

### 7.2 Wat in MVP zit

| Component | Technologie | Status |
|---|---|---|
| Website + leaderboard + PWA | Next.js (TypeScript) | MVP |
| Hosting website | Vercel (gratis tier) | MVP |
| Database | PostgreSQL (via Supabase) | MVP |
| Authenticatie | Supabase Auth (magic link; Google OAuth gepland, nog niet gebouwd) | MVP |
| Caching leaderboard | Cloudflare Workers + Cache API | MVP |
| Offline opslag | IndexedDB (via Dexie.js) | MVP |
| Score synchronisatie | Conditionele upsert in PostgreSQL | MVP |
| CDN | Cloudflare | MVP |
| CI/CD | GitHub Actions | MVP |

### 7.3 Wat later komt

| Component | Technologie | Status |
|---|---|---|
| Realtime leaderboard updates | Supabase Realtime WebSockets | Later |
| Native iOS/Android app | Expo / React Native | Later |
| Push notificaties | Web Push API of Expo | Later |
| Edge Functions (serverless) | Supabase Edge Functions (Deno) | Later |
| Monitoring | Sentry, Vercel Analytics | Later |
| QR-code generatie | Client-side library | Later |
| Kiosk/TV-modus | Dedicated view | Later |
| Webhooks voor integraties | Cloudflare Workers | Later |

### 7.4 Offline-first aanpak

De scoreer-app is een PWA die volledig werkt zonder internet:

1. Scores worden lokaal opgeslagen in IndexedDB (Dexie.js wrapper).
2. Bij verbinding: automatische synchronisatie via conditionele upsert.
3. Conflictresolutie: de score met de meest recente updated_at wint.
4. Organisator kan altijd handmatig corrigeren (override).
5. Na toernooisluiting (status = finished) worden geen nieuwe scores meer geaccepteerd via sync.

### 7.5 Synchronisatiemodel

- **Optimistisch:** Score wordt direct lokaal bijgewerkt en getoond.
- **Background sync:** Bij herstel van verbinding worden alle pending scores verstuurd.
- **Conditionele upsert:** PostgreSQL-functie upsert_score_if_newer() voorkomt dat oudere scores nieuwere overschrijven.
- **Statusindicatoren:** Online/offline/sync/error zijn altijd zichtbaar in de UI.

### 7.6 Exports

- **MVP:** JSON-export via REST API (leaderboard, deelnemers).
- **Later:** CSV- en PDF-export via UI, gestructureerde data-export voor archief.
- **Data-eigenaarschap:** Exports bevatten alle toernooi-data; organisator is eigenaar.

### 7.7 Database op hoofdlijnen

| Tabel | Doel | MVP |
|---|---|---|
| profiles | Gebruikersprofielen (aanvulling op auth.users) | Ja |
| courses | Golfbanen (eigenaar via created_by, privé standaard) | Ja |
| holes | Holes per baan (par, stroke index) | Ja |
| tees, loops, loop_holes | Meerdere teeboxen per baan, elk met eigen indeling en optionele WHS-ratings | Ja |
| tournaments | Toernooien (incl. rondes) | Ja |
| tournament_holes, tournament_tees | Bevroren kopie van de baanconfiguratie op moment van toernooistart | Ja |
| tournament_categories | Spelerscategorieën (bijv. handicap/geslacht) per toernooi | Ja |
| flights | Startgroepen | Ja |
| tournament_players | Deelnemers per toernooi (uitgebreid met optionele contact-/NGF-velden) | Ja |
| scores | Scores per speler per hole per ronde | Ja |
| access_codes | Toegangscodes voor recorders | Ja |
| matchplay_pairings | 1v1 koppelingen voor matchplay, per ronde | Ja |

*Dit is nog steeds een beknopt overzicht — zie `supabase/migrations/` voor de volledige, actuele SQL-definities. Vertrouw bij twijfel altijd op de migraties, niet op deze tabel.*

### 7.8 Authenticatie en rollen

| Rol | Toegang | Authenticatie |
|---|---|---|
| Organisator | Volledig beheer toernooi | Magic link of Google OAuth |
| Recorder | Scores invoeren | 8-tekens code of magic link |
| Toeschouwer | Leaderboard bekijken | Geen (anoniem) |

### 7.9 Security

- Row Level Security (RLS) op alle database-tabellen.
- Service_role_key nooit client-side gebruiken.
- CSP-headers (Content Security Policy) via Next.js config.
- Rate limiting op toegangscode-validatie (5 pogingen / 5 minuten).
- Alle gebruikersinvoer wordt gesanitized via Next.js en parameterized queries.

### 7.10 Self-hosting

- Supabase is volledig open source. Self-hosting draait exact dezelfde software, alleen andere .env variabelen.
- Docker Compose stack: kong, gotrue, postgrest, postgres, pgbouncer, storage.
- Minimale vereisten: 2 GB RAM, 1 vCPU, 20 GB schijf (Hetzner CX22 ~4 EUR/maand).
- Cloudflare Workers zijn optioneel bij self-hosting.

---

## 8. Roadmap

### Fase 1: MVP en eerste pilot (weken 1-13)

**Doelen:**
- Werkend product waarmee een toernooi van begin tot eind georganiseerd kan worden.
- Eerste pilot bij De Haenen toernooien.
- Valideren dat de basis werkt: aanmaken, scoren, leaderboard, uitslag.

**Scope:**
- Volledige MVP-scope zoals beschreven in sectie 4.
- Supabase + Vercel + Cloudflare infrastructuur.
- NL en EN beide live (in een eerdere versie van dit document stond dat alleen NL live zou zijn in de MVP — dat bleek achterhaald).
- eGolf4u baandatabase geïmporteerd.
- Handmatige spelersinvoer (geen CSV-import in MVP).

**Succescriteria:**
- Pilot toernooi verloopt zonder kritieke fouten.
- Scores worden correct ingevoerd, gesynchroniseerd en getoond op leaderboard.
- Organisator kan toernooi van begin tot eind beheren.
- Leaderboard is publiek toegankelijk en werkt op telefoon, laptop en TV.

**Risico's:**
- PWA offline werkt niet op oudere iOS-versies.
- Cloudflare daglimiet bereikt bij groter dan verwacht bezoek.
- Performance leaderboard bij veel gelijktijdige bezoekers.

**Nog niet gebouwd:**
- CSV-import spelers
- E-mailnotificaties
- QR-code

> **Correctie (documentatie-audit 2026-07-08):** matchplay-weergave en EN-vertaling stonden hier eerder ook genoemd als nog te bouwen — beide zijn al live.

### Fase 2: Pilot-validatie en verbeteren (maand 4-6)

**Doelen:**
- Feedback van De Haenen verwerken.
- Stabiliteit en gebruiksvriendelijkheid verbeteren.
- Eerste uitbreidingen op basis van echte gebruikerswensen.

**Scope:**
- Bugfixes en UX-verbeteringen op basis van pilot-feedback.
- CSV-import spelers.

**Succescriteria:**
- NPS >= 40 van pilotgebruikers.
- Minder dan 3 kritieke bugs per 10 toernooien.
- Nieuwe clubs melden zich aan.

**Risico's:**
- Feedback is te divers of tegenstrijdig.
- Scope creep: te veel features tegelijk willen bouwen.

**Nog niet gebouwd:**
- Premium features
- Realtime WebSockets
- Native app
- NGF-integratie

### Fase 3: Uitbouw naar andere groepen en clubs (maand 7-12)

**Doelen:**
- Platform openstellen voor alle Nederlandse clubs.
- Community opbouwen rond het project.
- Zelf-hosting documentatie en tooling verbeteren.

**Scope:**
- Seizoensranglijsten.
- Clubaccounts met meerdere organisatoren.
- QR-code generatie.
- CSV/PDF export uitslagen.
- Kiosk-modus leaderboard.
- Community bijdragen verwelkomen (contribution guidelines, issue templates).

**Succescriteria:**
- 20+ actieve organisatoren.
- 25+ toernooien per maand.
- 5+ self-hosting installaties.
- Community heeft 3+ externe contributors.

**Risico's:**
- Adoptie blijft laag buiten de pilotclub.
- Concurrentie vanuit bestaande apps wordt sterker.
- Onderhoudslast wordt te hoog voor huidige teamgrootte.

**Nog niet gebouwd:**
- Premium features
- NGF/WHS API-integratie
- Native app

### Fase 4: Premium features, schaalvergroting, integraties (maand 13+)

**Doelen:**
- Verduurzaming via premium inkomsten (hosting, branding, support).
- Schaalbaarheid verbeteren voor grotere clubs en meerdere gelijktijdige toernooien.
- Internationale uitbreiding voorbereiden.

**Scope:**
- Premium features: white-label, sponsorblokken, uitgebreide exports, beheerde hosting.
- Realtime leaderboard (WebSockets).
- NGF/WHS handicap API-integratie (mits toestemming).
- Monitoring en performance-optimalisatie.
- Baandatabase uitbreiden naar België en Duitsland.

**Succescriteria:**
- Premium-inkomsten dekken hostingkosten.
- 50+ actieve organisatoren.
- 100+ toernooien per maand.
- 10+ self-hosting installaties.

**Risico's:**
- Premium features worden niet gekocht.
- Community voelt zich vervreemd door commercialisering.
- Technische schuld vertraagt nieuwe features.

**Nog niet gebouwd:**
- Native iOS/Android app (tenzij PWA tekortschiet).
- GPS / afstandsmeter.
- Sociale feed of community platform.

---

## 9. Pilotplan — De Haenen toernooien

### 9.1 Waarom dit een goed startpunt is

De Haenen is een ideale pilotlocatie om de volgende redenen:

- **Bekende context:** De pilotbeheerder kent de club, de spelers en de toernooien. Directe feedbacklijn.
- **Beheersbare schaal:** De toernooien hebben een overzichtelijk aantal deelnemers (20-50 spelers), perfect voor MVP-testen.
- **Gevarieerde formats:** De Haenen organiseert verschillende type toernooien (stroke, stableford), wat de flexibiliteit van het platform test.
- **Realistische omstandigheden:** Echte golfbaan met bereikproblemen, echte spelers met verschillende devices, echte weersomstandigheden.
- **Gefocuste scope:** Geen afleiding door meerdere clubs met verschillende wensen; alle aandacht gaat naar één pilot.

### 9.2 Wat de eerste pilot moet bewijzen

| Stelling | Hoe meten we dit |
|---|---|
| Het platform is gebruiksvriendelijk genoeg voor niet-technische organisatoren | Organisator kan zelf een toernooi aanmaken zonder hulp |
| Score-invoer werkt offline en synchroniseert correct | Scores ingevoerd zonder bereik komen correct binnen |
| Het leaderboard is betrouwbaar en actueel | Leaderboard toont juiste stand binnen 30 sec na score-invoer |
| Recorders kunnen zonder account scores invoeren | 8-tekens code werkt voor alle recorders |
| Het platform werkt op verschillende apparaten | Tests op iOS, Android, desktop, TV |
| Privacy-instellingen zijn duidelijk en werkbaar | Spelers begrijpen wat er met hun naam gebeurt |

### 9.3 Welke feedback we willen ophalen

**Van de organisator:**
- Ontbreken er stappen in het aanmaakproces?
- Zijn de termen en opties duidelijk (format, scoring type, flights)?
- Wat was het meest frustrerend?
- Welke functie mis je het meest?

**Van recorders:**
- Was de code makkelijk in te voeren?
- Werkte offline scoring naar behoren?
- Was de interface groot genoeg (buiten, zonlicht)?
- Was de sync-status duidelijk?

**Van toeschouwers:**
- Was het leaderboard makkelijk te vinden?
- Was de informatie duidelijk en volledig?
- Werkte het op jouw apparaat?

### 9.4 Wat we meten

| Metriek | Doel | Hoe meten |
|---|---|---|
| Tijd om toernooi aan te maken | < 10 minuten | UI-meting |
| Score-invoer per hole (recorder) | < 5 seconden | UI-meting |
| Offline sync slaagkans | 100% | Logging |
| Leaderboard poll latency | < 30 seconden | Monitoring |
| Supportvragen tijdens toernooi | < 3 | Handmatig tellen |
| Tevredenheid organisator (NPS) | >= 40 | Enquete na toernooi |
| Tevredenheid recorder | >= 3.5/5 | Enquete na toernooi |

### 9.5 Wanneer is de pilot geslaagd?

De pilot is geslaagd als:

1. **Drie opeenvolgende toernooien** zonder kritieke fouten zijn verlopen.
2. De organisator zonder hulp van de ontwikkelaar een toernooi kan opzetten.
3. Minstens 80% van de recorders de score offline heeft ingevoerd zonder problemen.
4. De NPS-score van de organisator minstens 40 is.
5. Er zijn geen datalekken of privacy-incidenten geweest.
6. Alle functionaliteiten uit de MVP-scope zijn getest en goedgekeurd.

### 9.6 Wat daarna de volgende stap is

- Analyse van feedback en prioritering van verbeteringen.
- Uitrol naar 2-3 extra clubs voor bredere validatie.
- Publicatie van het project op GitHub met README en contribution guidelines.
- Community opbouwen via GitHub Discussions.

---

## 10. Concurrentieanalyse

### 10.1 Bestaande golf-toernooi platforms

| Platform | Type | Prijs | Open source | NL focus | Offline scoring | Leaderboard zonder account |
|---|---|---|---|---|---|---|
| GolfGameBook | App | Freemium | Nee | Nee | Beperkt | Nee |
| 18Birdies | App | Abonnement | Nee | Nee | Ja | Nee |
| Leaderboard Golf | App | Freemium | Nee | Nee | Nee | Nee |
| Golf.nl | Web | Gratis | Nee | Ja | Nee | Nee |
| PlayThru | App | Freemium | Nee | Nee | Ja | Nee |
| BlueGolf | Web/App | Betaald | Nee | Nee | Nee | Ja |
| GolfBox | Web | Betaald | Nee | Nee | Nee | Nee |
| ClubWizard | Web | Betaald | Nee | Nee | Nee | Nee |

### 10.2 Open source alternatieven

Er zijn geen volwassen, open source golf-toernooi platforms beschikbaar. Dit is een unieke kans. Bestaande open source golf projecten zijn ofwel verouderd, beperkt in functionaliteit, of gericht op individuele scoring in plaats van toernooiorganisatie.

### 10.3 Ecosystem lock-in

Vrijwel alle concurrenten gebruiken een gesloten model:
- Data kan niet worden geexporteerd naar andere systemen.
- Self-hosting is onmogelijk.
- Overstappen naar een andere aanbieder betekent dataverlies.
- Gebruikers zijn afhankelijk van het voortbestaan van het platform.

Dit is het grootste onderscheidende voordeel van OpenTour.

### 10.4 Sterke en zwakke punten van concurrenten

| Concurrent | Sterk in | Zwak in |
|---|---|---|
| GolfGameBook | Groot gebruikersbestand, sociale feed, community | Betaalmuur, geen self-hosting, data lock-in |
| 18Birdies | AI Coach, GPS, uitgebreide statistieken | Duur abonnement, Amerikaans gericht, complex |
| Leaderboard Golf | In-app messaging, groepscoordinatie | Beperkte gratis tier, geen offline |
| Golf.nl | Groot NL gebruikersbestand, clubinformatie | Verouderde UX, geen scoring tools |
| PlayThru | Snelle UX, eenvoudig | Beperkte features, klein platform |
| BlueGolf | Professionele toernooien, uitgebreid | Duur, complex voor kleine clubs |
| GolfBox | Clubmanagement integratie | Alleen grootzakelijk, duur |

### 10.5 Kansen voor OpenTour

1. **Open data / geen lock-in:** Het enige platform waar clubs eigenaar blijven van hun data.
2. **Volledig gratis voor kernfuncties:** Geen deelnemerslimiet, geen betaalmuur.
3. **NL-first:** Nederlandse taal, banen (eGolf4u), community.
4. **Leaderboard zonder account:** Uniek in de markt; familie en vrienden kunnen direct volgen.
5. **Offline-first PWA:** Geen app-installatie nodig, werkt op elk apparaat met een browser.
6. **Privacy-by-design:** In een tijd van toenemende privacybewustzijn een groot voordeel.
7. **Open source community:** Mogelijkheid tot bijdragen van clubs, ontwikkelaars en golfbonden.

### 10.6 Waarom OpenTour onderscheidend is

- **Geen van de concurrenten is open source.**
- **Geen van de concurrenten biedt self-hosting.**
- **Geen van de concurrenten heeft open data als kernprincipe.**
- **Geen van de concurrenten is volledig gratis zonder gebruikerslimiet.**
- **Geen van de concurrenten richt zich specifiek op de Nederlandse markt met NL-banen en taal.**

---

## 11. Risicoanalyse

### 11.1 Scope creep

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Hoog | Hoog | Strikt MVP-besluit; elke feature-vraag eerst toetsen aan productmanifest en pilot-feedback; "later" is een geldig antwoord. |

### 11.2 Te veel features te vroeg

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Hoog | Medium | Roadmap in fases; geen fase starten voordat de vorige is geëvalueerd; focus op "afmaken" in plaats van "beginnen". |

### 11.3 AVG/privacy risico's

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Hoog | Laag | Privacy-by-design vanaf dag 1; minimale dataverzameling; anonimisatie-opties; geen ledenbeheer; data-export altijd mogelijk. |

### 11.4 Onduidelijke data-eigendom

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Medium | Laag | Productmanifest legt data-eigendom vast; organisator is eigenaar; altijd exporteerbaar; bij beëindiging dienst: data-export voor alle gebruikers. |

### 11.5 Adoptierisico

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Kritiek | Medium | NL-first focus; pilot bij echte club; directe outreach naar clubsecretarissen; lage drempel (gratis, geen installatie); leaderboard zonder account. |

### 11.6 Technische complexiteit

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Hoog | Medium | Offline sync met conflictresolutie is het meest complexe onderdeel; grondig testen; conditionele upsert in DB voorkomt datasync-problemen. |

### 11.7 Concurrentierisico

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Medium | Medium | Onderscheidend door open source en open data, wat concurrenten niet kunnen of willen bieden; als een concurrent ook open source wordt, is dat winst voor de gebruiker. |

### 11.8 Monetisatie-risico

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Medium | Hoog | Premium features pas na bewezen product; inkomsten zijn secundair aan groei; als premium niet werkt, blijft gratis kern bestaan; self-hosting is altijd gratis. |

### 11.9 Onderhoudsrisico

| Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|
| Medium | Medium | Open source spreidt onderhoudslast; goede CI/CD en codekwaliteit; documentatie voor bijdragers; AGPL-licentie zorgt dat verbeteringen terugvloeien. |

---

## 12. Monetisatie

### 12.1 Wat altijd gratis blijft

Deze lijst is onvervreemdbaar. Geen van deze functies mag ooit achter een betalingsmuur verdwijnen:

- Toernooi aanmaken en beheren
- Spelers toevoegen (geen limiet)
- Scores invoeren (offline en online)
- Leaderboard bekijken (publiek, geen account)
- Basisstatistieken
- Self-hosting (volledige software)
- Data-export in open formaten

### 12.2 Waarom premium features later logisch zijn

Als het platform eenmaal bewezen heeft waardevol te zijn, ontstaat er vanzelf vraag naar extra's. Deze extra's zijn logisch verkoopbaar omdat ze:

- **Waarde toevoegen voor gevorderde gebruikers** zonder de basis te beperken.
- **Gericht zijn op organisatoren** (clubs, commissies) die een budget hebben, niet op individuele spelers.
- **Hostingkosten dekken** voor de beheerde versie (Supabase tiers, Cloudflare, Vercel).
- **Geen community splitsen** omdat de gratis kern intact blijft.

### 12.3 Premium features in scope

| Feature | Doelgroep | Waarom verkoopbaar |
|---|---|---|
| White-label leaderboard | Clubs | Eigen branding op leaderboard en uitslagenpagina |
| Sponsorblokken | Clubs | Inkomsten voor club, zichtbaarheid voor sponsors |
| Eigen domein | Clubs | Leaderboard op clubdomein (golfclub.nl/leaderboard) |
| Uitgebreide exports (PDF, CSV) | Organisatoren | Officiele uitslagen, scorecards voor leden |
| Beheerde hosting | Clubs | Geen technische kennis nodig; wij hosten |
| Extra analytics | Clubs | Clubstatistieken, trends, deelnemersaantallen |
| Prioriteitsondersteuning | Organisatoren | Snelle hulp bij toernooien |

> **Stand van zaken (documentatie-audit 2026-07-08):** de plek voor sponsorblokken staat al visueel in het leaderboard (drie posities: top/mid/bottom), maar toont nog alleen placeholder-tekst — er is geen backend, geen advertentiedata en geen manier voor een organisator om dit te vullen. De overige premium-features in deze tabel zijn nog niet gestart.

### 12.4 Hoe gratis basis behouden blijft zonder het product kapot te maken

- Premium features zijn **toevoegingen**, geen onthoudingen. Er wordt geen gratis functie verwijderd om hem betaald aan te bieden.
- De grens tussen gratis en premium is **helder en stabiel**. Gebruikers weten waar ze aan toe zijn.
- Self-hosting is altijd gratis, ook met premium-waardige features.
- Premium-inkomsten zijn bedoeld om de beheerde dienst te bekostigen, niet als primaire winstmotor.
- Als premium niet werkt: het project draait door met de gratis kern en community-bijdragen.

### 12.5 Gratis tier: enkele gebruikers vs. Vereniging

- **Enkele gebruiker (gratis):** 1 organisator met 1 account mag altijd gratis onbeperkt wedstrijden aanmaken en toernooien organiseren. Geen limiet op aantal toernooien, spelers of leaderboard-weergave.
- **Vereniging (betaald, later):** Voor organisaties die meerdere organisator-accounts of beheerders nodig hebben. Wat dit precies inhoudt (aantal accounts, extra functionaliteiten, prijs) wordt later bepaald.
- Self-hosting valt buiten deze indeling: self-hosters hebben altijd alle functionaliteit, ongeacht of ze 'enkele gebruiker' of 'vereniging' zijn.

---

## 13. Open vragen en beslissingen

### 13.1 Open vragen

| # | Vraag | Context | Prioriteit |
|---|---|---|---|
| 1 | Eigen domeinnaam (i.p.v. de Vercel-subdomein)? | Merknaam is intussen de facto **OpenTour** (repo, package-namen). Een eigen domein lijkt nog niet geregeld. | Hoog |
| 2 | Lanceringstrategie: via welke kanalen eerste gebruikers? | Instagram, LinkedIn, Reddit, directe e-mail naar NL-organisatoren? | Hoog |
| 3 | NGF/WHS handicap integratie mogelijk in de toekomst? | NGF moet toestemming geven. Geen prioriteit voor MVP. | Laag |
| 4 | Baandatabase buiten NL: TheGolfAPI of andere bron? | eGolf4u dekt alleen NL. Evaluatie nodig na MVP. | Medium |
| 5 | Aparte Discord community of GitHub Discussions? | Afhankelijk van community-omvang na launch. | Laag |
| 6 | ~~Figma designs: zelf ontwerpen of component library?~~ | **Beantwoord:** een eigen Tailwind-tokensysteem, geen shadcn/ui of Radix (zie §14.3). | — |
| 7 | Magic link fallback als e-mail niet aankomt? | OTP-code per e-mail overwegen als alternatief. | Medium |
| 8 | PWA-betrouwbaarheid op oudere Android? | Testen op Android 8.0 Chromium WebView; resultaat bepaalt of PWA volstaat. | Medium |
| 9 | Welke prijs voor premium features? | Moet hostingkosten dekken; marktconform bepalen na MVP. | Laag |
| 10 | Hoe omgaan met niet-NL gebruikers die meedoen aan een NL toernooi? | Leaderboard-interface is nu in zowel NL als EN beschikbaar. | Laag |

### 13.2 Genomen beslissingen

| # | Beslissing | Reden |
|---|---|---|
| B1 | Licentie: AGPL-3.0 | Beschermt open source karakter; sterker dan GPL bij webgebruik. |
| B2 | Backend: Supabase | Gratis tier, self-hostable, goed gedocumenteerd, PostgreSQL. |
| B3 | Geen aparte leaderboard-app in MVP | Website route dekt PC, tablet, telefoon én TV af. |
| B4 | Cloudflare Workers als cachelaag | Gratis Cache API + rate limiting; POST direct naar Supabase. |
| B5 | NL + EN vanaf dag 1 | Andere talen later via community bijdragen. |
| B6 | Geen Azure | Alles via Supabase + Vercel + Cloudflare; geen toegevoegde waarde. |
| B7 | Monorepo met Turborepo | Website + scoreer-PWA + Workers + gedeelde packages in een repo. |
| B8 | Primair doel fase 1: groei, niet inkomsten | Free tier strategie; self-hosting altijd beschikbaar. |
| B9 | Scoreer-app: PWA i.p.v. native app | Geen native features nodig in MVP; lagere drempel. |
| B10 | Website: Next.js op Vercel | SSG + SSR; gratis tier; PWA via next-pwa. |
| B11 | Offline opslag: IndexedDB via Dexie.js | PWA-standaard; voldoende voor score-opslag. |
| B12 | Baandatabase NL: eGolf4u handmatige import | Eenmalig; geen live API-afhankelijkheid. |
| B13 | Conflictresolutie: conditionele upsert op updated_at | Nieuwere timestamp wint; afgedwongen in PostgreSQL. |
| B14 | Geen Supabase Realtime in MVP | Polling + Cloudflare cache is voldoende. |
| B15 | Geen Supabase Edge Functions in MVP | Toegangscode-validatie via Next.js API route. |
| B16 | Toegangscode: 8 alfanumeriek, hoofdletterongevoelig | Simpel voor oudere gebruikers; rate limiting als beveiliging. |
| B17 | Geen ledenbeheer | Toernooigebonden spelerslijsten, geen permanente ledenadministratie. |
| B18 | Spelerstatussen: registered, confirmed, withdrawn, DNS, DNF, DSQ | Conform NGF-wedstrijdregels. |
| B19 | Matchplay in MVP: hole-by-hole, 1v1 pairings | Zelfde score-invoer als stroke; aparte view voor standbepaling. |
| B20 | Stroke index verplicht per hole | Zonder SI is net scoring onmogelijk. |

### 13.3 Bewust nog niet vastgelegd

- **Exacte UI-designs:** Worden uitgewerkt in een apart design system (shadcn/ui).
- **Testing details:** Teststrategie wordt apart beschreven (Playwright, Vitest).
- **CI/CD configuratie:** Wordt vastgelegd in GitHub Actions workflows in de repo.
- **Database migraties:** Worden vastgelegd als SQL migraties in supabase/migrations/.
- **API documentatie:** Wordt gegenereerd uit OpenAPI/Swagger specs na MVP.
- **Hosting kostenraming:** Wordt bepaald na pilot, op basis van daadwerkelijk gebruik.

---

## 14. Bijlagen

### 14.1 Database schema (beknopt)

Zie het volledige schema in `supabase/migrations/` voor de actuele SQL-definities. Het datamodel bevat deze kernentiteiten:

- `profiles` — gebruikersprofielen (aanvulling op Supabase Auth)
- `courses` — golfbanen (naam, locatie, bron)
- `holes` — holes per baan (nummer, par, stroke index)
- `tournaments` — toernooien (naam, format, status, rondes)
- `flights` — startgroepen (naam, starttijd, tee)
- `tournament_players` — deelnemers (naam, handicap, status)
- `scores` — scores per hole (strokes, round_number)
- `access_codes` — toegangscodes voor recorders
- `matchplay_pairings` — 1v1 koppelingen voor matchplay

### 14.2 Licentie

**AGPL-3.0 (GNU Affero General Public License v3)**

- Gebruik is volledig vrij, ook voor commerciele doeleinden.
- Wie de software aanpast en als webservice aanbiedt, moet de broncode delen.
- Self-hosting voor intern gebruik is altijd mogelijk zonder publicatieplicht.
- Premium features worden in een aparte repository ontwikkeld buiten de AGPL.

### 14.3 Technische stack (samenvatting)

| Laag | Technologie | Waarom |
|---|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) | SSG/SSR, PWA, Vercel hosting |
| Styling | Tailwind CSS met een eigen semantisch design-tokensysteem (CSS-variabelen voor surface/border/content/score-kleuren, licht+donker+systeem via `next-themes`) | Consistente UI, licht/donker-thema, geen externe componentbibliotheek |
| Backend | Supabase (PostgreSQL) | Auth, DB, Storage, self-hostable |
| Cache | Cloudflare Workers + Cache API | Gratis edge-caching, rate limiting |
| Offline | IndexedDB (Dexie.js) | PWA offline opslag |
| i18n | next-intl | NL + EN, beide live |
| CI/CD | GitHub Actions | Lint, typecheck, test, build, deploy |
| Monorepo | Turborepo | Build caching, gedeelde packages |

> **Correctie (documentatie-audit 2026-07-08):** een eerdere versie noemde shadcn/ui (Radix + Tailwind) en next-i18next. Geen van beide wordt gebruikt in de huidige codebase — styling is een eigen Tailwind-tokensysteem, i18n loopt via next-intl (App Router-conventie, `app/[locale]/...`).

### 14.4 Gebruikersflows

Voor de uitgebreide, onderhouden beschrijving van gebruikersflows (met acceptatiecriteria en technische specificatie per stap): zie `docs/user-stories/`, met name:
- Toernooi aanmaken en beheren: `02-organizer-flow.md`
- Score invoeren (drie modi): `03-scorer-flow.md`
- Leaderboard volgen: `04-spectator-leaderboard.md`
- Toegangscode kwijt, inloggen: `05-authentication-and-access.md`
- Baanbeheer en eigenaarschap: `10-course-ownership-and-visibility.md`

*(Een eerdere versie van dit document verwees hiervoor naar "sectie 13 van het oorspronkelijke document" — dat was `golf-app-design-document-v03-definitief.md`, dat sindsdien niet meer wordt bijgehouden. De user-stories in GitHub zijn nu de actuele bron.)*

---

*Dit is een levend document. Aanvullingen en correcties worden direct hier verwerkt. Versiehistorie via Git-commits.*