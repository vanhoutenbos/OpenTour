# Epic 07 — Baandatabase en open data

## Epic beschrijving

Golfbanen vormen de vaste context van elk toernooi. Dit epic beschrijft hoe banen worden beheerd: aanmaken, importeren uit bestaande bronnen, en beschikbaar stellen als open data.

## Rationale

Een toernooi zonder baan is geen toernooi. De baandatabase is de stille ruggengraat van het platform. Door banen uit open bronnen (eGolf4u) te importeren en gebruikers zelf banen te laten aanmaken, ontstaat een groeiende, open dataset waar iedereen baat bij heeft.

---

## User stories

### US-CRS-01 — Handmatig een baan aanmaken

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een nieuwe golfbaan kan aanmaken met naam, locatie, holes, par en stroke index
- **Waarde:** Ik kan ook toernooien organiseren op banen die nog niet in de database staan
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-01
- **Acceptatiecriteria:**
  - Formulier: naam (verplicht), locatie (optioneel), land (standaard NL)
  - Per hole: nummer, par (3-5), stroke index (1-18, verplicht)
  - Ondersteuning voor 9 en 18 holes (custom aantallen mogelijk)
  - Stroke index is uniek binnen de baan (geen duplicate SI)
  - Na opslaan: baan wordt toegevoegd aan de database en is beschikbaar bij toernooi-aanmaak
  - Alleen de eigenaar kan de baan bewerken
  - Publiceren/indienen naar een bredere groep is een latere workflow via een aparte submit-knop
- **Opmerkingen:**
  - Stroke index is verplicht omdat net-scoring zonder SI onmogelijk is
  - De eerste versie blijft eigendom van één organisator; review/publicatie komt later

## Technische specificatie

**Componenten:** `CourseForm` (nog te bouwen, `components/course/CourseForm.tsx` — multi-step form: basic info + holes per hole), `CoursePage` (nog te bouwen, `app/[locale]/course/new/page.tsx` en `app/[locale]/course/[id]/page.tsx`)
**Data flow:** Formulier → `INSERT INTO courses (name, location, country, holes_count, source='custom', created_by)` → daarna per hole: `INSERT INTO holes (course_id, number, par, stroke_index)` via Supabase (batch insert)
**API endpoints:** geen — directe Supabase insert via `getSupabaseBrowser()`
**Validatie:** `name` is verplicht; `par` per hole tussen 3-5; `stroke_index` uniek binnen de baan (1-18, database UNIQUE constraint); minimaal 9 holes; `location` optioneel
**Staten:** Loading (opslaan), Error (validatiefout), Success (redirect naar baan-detail of terug naar toernooi-wizard)
**i18n keys:** `course.create.title`, `course.create.name`, `course.create.location`, `course.create.holes`, `course.create.hole_number`, `course.create.par`, `course.create.stroke_index`, `course.create.submit` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Formulier heeft sectie voor baan-info (naam, locatie, land) en per-hole editor (nummer, par, stroke index)
  - Default 18 holes, met optie voor 9 holes (custom aantallen mogelijk)
  - Stroke index 1-18, uniek per baan (UNIQUE(course_id, stroke_index))
  - Nieuwe baan krijgt `source = 'custom'`, `is_verified = false`, `created_by = auth.uid()`
  - Owner kan later een submit-knop gebruiken om de baan aan een review/publicatieflow aan te bieden

---

### US-CRS-02 — Bestaande baan kiezen uit database

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een bestaande baan kan kiezen uit de database bij het aanmaken van een toernooi
- **Waarde:** Ik hoef de baan niet opnieuw in te voeren als deze al bekend is
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-CRS-01, eGolf4u import
- **Acceptatiecriteria:**
  - Zoekveld met autocomplete op baannaam bij toernooi-aanmaak
  - Resultaten tonen: naam, locatie, aantal holes
  - Na selectie: holes (par + SI) worden automatisch geladen voor het toernooi
  - Filter op land (standaard NL)
  - Eerder door deze organisator aangemaakte banen verschijnen bovenaan
  - In het beheer-overzicht ziet een gebruiker alleen de banen die hij/zij zelf bezit
- **Opmerkingen:**
  - Dit is de snelste weg naar een werkend toernooi
  - Database bevat in MVP de geimporteerde eGolf4u banen + handmatig aangemaakte banen

## Technische specificatie

**Componenten:** `CourseSelector` (bestaand, inline in `NewTournamentPage` — lijst van courses met selectie), `CourseSearchInput` (nog te bouwen — autocomplete/zoekveld op baannaam)
**Data flow:** `SELECT * FROM courses ORDER BY name` via Supabase → toon in selecteerbare lijst → geselecteerde `course_id` opgeslagen in form state (sessionStorage) → bij toernooi-aanmaak: `course_id` wordt opgeslagen in `tournaments.course_id`
**API endpoints:** geen — directe Supabase query via `getSupabaseBrowser()`
**Validatie:** course_id optioneel (kan later worden ingesteld); als geselecteerd: moet verwijzen naar bestaande course
**Staten:** Loading (skeleton cards), Empty ("Geen banen gevonden" + "Baan aanmaken" link), Selected (groene border), Not selected ("Nog niet kiezen" optie)
**i18n keys:** `tournament.create.select_course`, `tournament.create.course_empty`, `course.search.placeholder` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Course selector toont alle banen met: naam, locatie, aantal holes
  - Zoekveld met client-side filter op baannaam (nog te implementeren — momenteel statische lijst)
  - "Nog niet kiezen" optie om baan later in te stellen
  - Eigen banen van organisator verschijnen bovenaan (via `ORDER BY created_by = auth.uid() DESC, name`)
  - Publiek delen is niet onderdeel van MVP; owner-only edit blijft de standaard

---

### US-CRS-03 — eGolf4u banen importeren

- **Rol:** Ontwikkelaar / beheerder van het platform
- **Doel:** Dat ik de eGolf4u dataset kan importeren in de baandatabase
- **Waarde:** Nederlandse banen zijn direct beschikbaar bij de pilot zonder handmatig invoeren
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** beschikbaarheid eGolf4u JSON-export
- **Acceptatiecriteria:**
  - Import-script leest eGolf4u JSON-formaat
  - Per club: course(s) met holes (par, stroke index, positie)
  - Geimporteerde banen krijgen status `is_verified = true` (bron is betrouwbaar)
  - Duplicaten worden overschreven (upsert op external_id)
  - Na import: banen zijn beschikbaar via US-CRS-02
  - Import is eenmalig (geen live API-koppeling in MVP)
- **Opmerkingen:**
  - Import wordt door de beheerder uitgevoerd, niet door de organisator
  - Geen live API-afhankelijkheid van eGolf4u
  - Later: community-gedreven baanverificatie en uitbreiding

## Technische specificatie

**Componenten:** `import-egolf4u.ts` (nog te bouwen, `scripts/import-egolf4u.ts` — eenmalig Node.js script, geen UI)
**Data flow:** eGolf4u JSON-bestand (eenmalige export, geen live API) → script parseert JSON → `INSERT INTO courses` met `source = 'egolf4u'`, `is_verified = true`, `external_id = eGolf4u_id` → per hole: `INSERT INTO holes` → upsert op `external_id` voor duplicaten
**API endpoints:** geen — direct database script met service_role key
**Validatie:** JSON moet geldig eGolf4u formaat zijn; par 3-5; stroke index 1-18; duplicates worden overschreven (upsert on `external_id`)
**Staten:** Running (console output per baan), Error (parse fout of insert fout), Complete (aantal geimporteerde banen en holes)
**i18n keys:** geen — script-only, geen UI
**Acceptatiecriteria uitgebreid:**
  - Import-script leest eGolf4u JSON (pad als CLI argument)
  - Per club: course(s) met array van holes (par, stroke index, hole nummer)
  - `holes_count` wordt berekend uit array lengte
  - `is_verified = true` (bron is betrouwbaar)
  - Upsert op `external_id` (UNIQUE constraint op `courses.external_id` — voeg toe indien nog niet aanwezig)
  - Eenmalig uit te voeren door beheerder; geen onderdeel van CI/CD pipeline

---

### US-CRS-04 — Baan bewerken

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een door mij aangemaakte baan kan bewerken (holes, par, SI aanpassen)
- **Waarde:** Ik kan fouten corrigeren of banen actualiseren
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-CRS-01
- **Acceptatiecriteria:**
  - Knop "Bewerk baan" op baandetailpagina
  - Wijzigingen worden direct opgeslagen
  - Toernooien die de baan gebruiken krijgen de geupdate data (holes)
  - Alleen door de aanmaker van de baan te bewerken
  - Geimporteerde banen (eGolf4u) kunnen niet worden bewerkt (alleen door beheerder)
- **Opmerkingen:**
  - Voorkomt dat verouderde baan-data leidt tot foute uitslagen
  - Geimporteerde banen zijn readonly om datakwaliteit te waarborgen

## Technische specificatie

**Componenten:** `CourseEditForm` (nog te bouwen, hergebruikt `CourseForm` component in edit-modus), `CourseDetailPage` (nog te bouwen, `app/[locale]/course/[id]/page.tsx` met "Bewerk" knop)
**Data flow:** `SELECT * FROM courses WHERE id = ...` → vul formulier met bestaande data → `UPDATE courses SET ...` + voor holes: `DELETE FROM holes WHERE course_id = ...` + `INSERT INTO holes ...` (of individuele updates)
**API endpoints:** geen — directe Supabase query/update via `getSupabaseBrowser()`
**Validatie:** alleen `source = 'custom'` banen kunnen worden bewerkt (RLS: `courses_update_own` voor `created_by = auth.uid()`); holes moeten valide par/SI hebben; `strokes_index` uniek
**Staten:** Loading (bestaande data ophalen), Edit form (vooringevuld), Saving (opslaan), Saved (redirect naar baan-detail), Read-only (geimporteerde banen — geen bewerk-knop)
**i18n keys:** `course.edit.title`, `course.edit.submit`, `course.edit.readonly`, `course.edit.not_owner` (nieuw)
**Acceptatiecriteria uitgebreid:**
  - Alleen `custom` banen kunnen worden bewerkt (check op `course.source !== 'egolf4u'`)
  - Alleen `created_by = auth.uid()` (via RLS)
  - Wijzigingen in holes werken door naar scores? Scores verwijzen naar `hole_id` — holes worden niet verwijderd als ze scores hebben (FK constraint). Oplossing: markeer oude holes als deprecated en voeg nieuwe toe.
  - Toernooien die de baan gebruiken krijgen de geüpdatete hole-data (nieuwe holes, zelfde IDs bij update)

---

### US-CRS-05 — Baan indienen voor review/publicatie

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een door mij aangemaakte baan kan indienen voor review zodat een aangewezen groep deze later kan publiceren
- **Waarde:** Ik houd beheer eenvoudig nu, maar kan de baan later veilig laten reviewen
- **Prioriteit:** C
- **Fase:** Later
- **Afhankelijk van:** US-CRS-04
- **Acceptatiecriteria:**
  - Knop "Submit voor review" op baandetailpagina
  - Submitted banen krijgen een status die zichtbaar is voor reviewers
  - Alleen een aangewezen groep reviewers/rollen kan de baan publiceren
  - Na publicatie kan een baan niet meer vrij worden aangepast zonder nieuwe draft-versie
- **Opmerkingen:**
  - Dit is de basis voor een beheerde publish-flow met versiebeheer
  - Later: draft-versies, review-queue en publish approvals

---

### US-CRS-06 — Banen exporteren als open data

- **Rol:** Ontwikkelaar / derde partij
- **Doel:** Dat ik baangegevens kan opvragen via de API in een gestandaardiseerd formaat
- **Waarde:** Ik kan de data gebruiken voor eigen toepassingen of analyses
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-CRS-01
- **Acceptatiecriteria:**
  - Endpoint: GET /api/courses (lijst van alle publieke banen)
  - Endpoint: GET /api/courses/:id (details + holes)
  - Response in JSON met: naam, locatie, holes (nummer, par, SI)
  - Publieke banen zijn vrij toegankelijk zonder authenticatie
  - Documentatie bij de API
- **Opmerkingen:**
  - Open data is een kernprincipe (zie productmanifest)
  - Data kan worden gebruikt door andere golf-apps, researchers, of clubs

---

### US-CRS-07 — Baandatabase uitbreiden naar het buitenland

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik ook banen buiten Nederland kan kiezen
- **Waarde:** Ik kan toernooien organiseren op buitenlandse banen (Belgie, Duitsland)
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-CRS-02
- **Acceptatiecriteria:**
  - Bronnen zoals TheGolfAPI of community-bijdragen
  - Filter op land bij het kiezen van een baan
  - Import-script voor geselecteerde buitenlandse bronnen
  - Taal van baan-data in lokale taal (indien beschikbaar)
- **Opmerkingen:**
  - eGolf4u dekt alleen Nederland
  - Uitbreiding naar Belgie en Duitsland is de logische volgende stap na NL-pilot
  - TheGolfAPI (gratis tier) is de primaire kandidaat

---

### US-CRS-08 — Meerdere tees per baan met eigen SI/afstand (loops)

- **Rol:** Organisator/baanbeheerder
- **Doel:** Dat ik meerdere teeboxen (bijv. geel, rood, wit) per baan kan vastleggen, elk met eigen indeling
- **Waarde:** Verschillende spelers/categorieën spelen vanaf verschillende tees met een correcte, eigen stroke index en afstand
- **Prioriteit:** S
- **Fase:** MVP
- **Status:** ✅ Done
- **Afhankelijk van:** US-CRS-01
- **Acceptatiecriteria:**
  - Een baan kan meerdere `loops` hebben (front9/back9/custom-samenstelling)
  - Elke tee heeft eigen holes-configuratie via `loop_holes` (par, SI, afstand kunnen per tee verschillen)
  - Beheer via `TeeManagerSection` op de baanpagina
- **Opmerkingen:**
  - Dit vervangt de MVP-aanname uit het oorspronkelijke document dat er "één set holes per baan" is (§7.1) — dat gold alleen voor de allereerste eGolf4u-import

**Technische specificatie**
**Migratie:** `tees_loops` — tabellen `tees`, `loops`, `loop_holes`, `hole_tee_distances`
**Componenten:** `TeeManagerSection` (`components/course/`)

---

### US-CRS-09 — WHS slope- en course-rating per tee invoeren

- **Rol:** Organisator/baanbeheerder
- **Doel:** Dat ik de WHS slope rating en course rating per tee kan invoeren
- **Waarde:** Net-scoring kan straks de officiële WHS-formule gebruiken in plaats van de vereenvoudigde versie
- **Prioriteit:** C
- **Fase:** MVP
- **Status:** 🔄 In Progress
- **Afhankelijk van:** US-CRS-08
- **Acceptatiecriteria:**
  - Invoervelden voor `slope_rating` en `course_rating` per tee
  - Waarden zijn optioneel (geen harde eis om ze in te vullen)
  - **Nog niet gebouwd:** de playing-handicap-formule (`index × slope/113 + (rating − par)`) daadwerkelijk gebruiken in de leaderboard/scoring-berekening — vandaag draait daar nog altijd de vereenvoudigde net-berekening uit §7.2 van het oorspronkelijke document
- **Opmerkingen:**
  - Grondwerk is gelegd; de doorkoppeling naar de leaderboard-view is de volgende stap

**Technische specificatie**
**Migratie:** `tees_loops` (`slope_rating`, `course_rating` kolommen op `tees`), meegenomen in `tournament_tees` bij toernooi-activering
**Componenten:** `TeeManagerSection`, WHS-ratingspaneel op `app/[locale]/course/[id]/page.tsx`

---

### US-CRS-10 — Courseconfiguratie bevriezen bij toernooistart (snapshot)

- **Rol:** Systeem (automatisch, geen directe gebruikersactie)
- **Doel:** Dat de par, stroke index en tee-indeling van een baan bevroren worden zodra een toernooi start
- **Waarde:** Als een organisator de baan ná toernooistart bewerkt (bijv. voor een ander, toekomstig toernooi), verandert de score-berekening van een lopend/afgerond toernooi niet met terugwerkende kracht
- **Prioriteit:** M
- **Fase:** MVP
- **Status:** ✅ Done
- **Afhankelijk van:** US-CRS-08, US-ORG-05
- **Acceptatiecriteria:**
  - Bij statusovergang `draft` → `active`: automatische kopie van holes/tees naar toernooi-specifieke tabellen
  - Alle leaderboard- en scoreviews lezen vanaf dat moment uit de bevroren kopie, niet uit de live baan-tabellen
- **Opmerkingen:**
  - Loste een concrete migratiedrift op (zie de CI/CD-notitie in epic 09) — de eerste versie van dit patroon was toegepast op productie voordat de migratie zelf gecommit was

**Technische specificatie**
**Tabellen:** `tournament_holes`, `tournament_tees` (kopie van `holes`/`tees` op moment van activering)
**Trigger:** Postgres `AFTER UPDATE`-trigger op `tournaments`, vuurt bij `status: draft → active`
**Views omgezet:** `tournament_leaderboard`, `matchplay_standings`, `player_hole_scores`, `course_hole_stats` wijzen nu naar `tournament_holes` i.p.v. `holes`
**FK-wijziging:** `scores.hole_id` verwijst nu naar `tournament_holes.id`

---

## Open vragen

| # | Vraag |
|---|---|
| CRS-O1 | ~~Moeten we meerdere tee-bronnen ondersteunen (geel, rood, wit) met verschillende par/SI?~~ **Opgelost:** zie US-CRS-08, tees + loops ondersteunen dit sinds de `tees_loops`-migratie. |
| CRS-O2 | Hoe omgaan met banen die zijn gerenoveerd? Verouderde data markeren of overschrijven? |
| CRS-O3 | TheGolfAPI of een andere bron voor internationale banen? Evaluatie nodig. |
| CRS-O4 | Moet de playing-handicap-formule (US-CRS-09) automatisch worden toegepast zodra beide ratings zijn ingevuld, of moet de organisator dit expliciet activeren per toernooi? |
