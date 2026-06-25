# Epic 04 — Toeschouwer: leaderboard

## Epic beschrijving

Het publieke leaderboard is het venster op het toernooi voor iedereen die niet zelf speelt of scoort. Het moet direct toegankelijk zijn, zonder drempels, en werken op elk apparaat.

## Rationale

Toeschouwers zijn de grootste potentiële gebruikersgroep. Familie, clubleden en sponsors willen snel de stand zien zonder app-installatie of account. Een laagdrempelig, betrouwbaar leaderboard is de beste marketing voor het platform: deel een link, en iedereen ziet het toernooi live.

---

## User stories

### US-SPE-01 — Leaderboard bekijken zonder account

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik het leaderboard kan bekijken zonder in te loggen of een app te installeren
- **Waarde:** Ik heb direct toegang, zonder drempels
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-05 (toernooi moet `active` of `finished` zijn)
- **Acceptatiecriteria:**
  - Leaderboard is publiek toegankelijk via URL /tournament/[id]
  - Geen authenticatie, geen cookie-toestemming (functionele cookies alleen)
  - Geen app-installatie vereist; werkt in elke moderne browser
  - Leaderboard laadt binnen 2 seconden op 4G
- **Opmerkingen:**
  - Dit is een van de belangrijkste onderscheidende kenmerken vs concurrenten
  - Deelbare link is de kern van het leaderboard-concept

---

### US-SPE-02 — Leaderboard openen via deelbare link

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een URL kan delen waarmee iedereen het leaderboard kan openen
- **Waarde:** Ik kan de link verspreiden via WhatsApp, e-mail, de clubapp, of een print op het prikbord
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Leaderboard heeft een vaste, stabiele URL (/tournament/[id])
  - URL blijft werken ook nadat het toernooi is afgesloten (archief)
  - URL is deelbaar zonder verdere actie
  - Optie om URL te kopiëren vanuit het beheerscherm
- **Opmerkingen:**
  - Later: QR-code generatie voor de URL (US-SPE-09)
  - De URL is bewust simpel: geen hash, geen query-parameters

---

### US-SPE-03 — Leaderboard automatisch updaten

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat het leaderboard automatisch wordt ververst met nieuwe scores
- **Waarde:** Ik zie de stand zoals die is, zonder handmatig te hoeven refreshen
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SCR-06 (scores worden gesynchroniseerd)
- **Acceptatiecriteria:**
  - Leaderboard pollt elke 30 seconden voor nieuwe data
  - "Bijgewerkt om HH:MM:SS" zichtbaar onderaan het leaderboard
  - Geen merkbare flikkering of layout-shift bij update
  - Bij geen verandering: geen visuele reset
- **Opmerkingen:**
  - 30 seconden is een balans tussen real-time gevoel en belasting
  - Later: WebSockets voor echte real-time updates (US-SPE-11)

---

### US-SPE-04 — Leaderboard toont positie, naam, score en holes gespeeld

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik per speler zie: positie, naam, totaalscore, score to par, en aantal holes gespeeld
- **Waarde:** Ik begrijp in een oogopslag hoe het toernooi verloopt
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Kolommen: positie, naam, holes gespeeld, totaal, score to par
  - Bij stableford: score to par vervangen door stableford punten
  - Sorteervolgorde: beste score eerst, DNS/DNF/DSQ onderaan
  - Positie wordt berekend op basis van format (stroke, stableford, matchplay)
- **Opmerkingen:**
  - Informatie-dichtheid is afgestemd op scannen, niet op lezen

---

### US-SPE-05 — Spelerstatus badges op leaderboard

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik kan zien of een speler DNS, DNF of DSQ is
- **Waarde:** Ik begrijp waarom iemand niet in de reguliere ranglijst staat
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-07
- **Acceptatiecriteria:**
  - DNS, DNF, DSQ badges zijn zichtbaar naast de spelernaam
  - Badge heeft een duidelijke kleur en tekst (grijs, oranje, rood)
  - Betrokken spelers staan altijd onderaan de ranglijst
  - Tooltip of korte uitleg bij hover/tap ("Did Not Finish - gestopt na 12 holes")
- **Opmerkingen:**
  - Voorkomt verwarring bij toeschouwers die een speler missen in de top

---

### US-SPE-06 — Pauzebanner bij gepauzeerd toernooi

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik een duidelijke melding zie als het toernooi is gepauzeerd, met de reden
- **Waarde:** Ik weet wat er aan de hand is en verwacht geen updates
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-06
- **Acceptatiecriteria:**
  - Prominente banner boven het leaderboard bij status `paused`
  - Banner toont de door de organisator ingevoerde reden
  - Leaderboard-data blijft zichtbaar (bevroren op moment van pauzeren)
  - Banner verdwijnt wanneer toernooi weer `active` wordt
- **Opmerkingen:**
  - Zonder duidelijke pauzering ontstaan er vragen aan de organisator
  - Reden is verplicht bij pauzeren (US-ORG-06)

---

### US-SPE-07 — Leaderboard als archief na afloop

- **Rol:** Organisator van een toernooi
- **Doel:** Dat het leaderboard ook na afloop van het toernooi bereikbaar blijft
- **Waarde:** De einduitslag is altijd raadpleegbaar, ook weken of maanden later
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-ORG-12
- **Acceptatiecriteria:**
  - Leaderboard blijft bereikbaar via dezelfde URL na `finished`
  - Leaderboard toont "Afgesloten" of "Einduitslag" banner
  - Scores kunnen niet meer worden gewijzigd
  - Data blijft beschikbaar zolang het toernooi niet wordt verwijderd
- **Opmerkingen:**
  - Archivering is belangrijk voor clubhistorie en seizoensranglijsten
  - Data kan ook worden geexporteerd (US-PRI-05)

---

### US-SPE-08a — Fullscreen kiosk-weergave

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik het leaderboard in fullscreen kan tonen op een TV of projector, zonder browser UI
- **Waarde:** Bezoekers in het clubhuis zien alleen het leaderboard, geen browser-chrome
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - URL-parameter (?kiosk) activeert kiosk-modus
  - Geen browser UI (fullscreen)
  - Groot lettertype, minimaal 48px voor spelersnamen
  - Leaderboard past zich aan aan elk schermformaat (TV, projector, monitor)
  - Automatische verversing zonder zichtbare polling-indicatoren

### US-SPE-08b — Auto-scroll in kiosk-modus

- **Rol:** Organisator van een toernooi
- **Doel:** Dat het leaderboard automatisch scrollt als de lijst niet op 1 scherm past
- **Waarde:** Alle spelers zijn zichtbaar, ook bij een groot deelnemersveld
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-08a
- **Acceptatiecriteria:**
  - Automatisch scrollen door de lijst als deze langer is dan 1 scherm
  - Scroll-snelheid configureerbaar (pauze per pagina)
  - Scrollen stopt bij de laatste speler, dan terug naar boven
  - Handmatig scrollen (muis/touch) onderbreekt auto-scroll tijdelijk

---

### US-SPE-09 — QR-code voor leaderboard-URL

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik een QR-code kan tonen of printen die verwijst naar het leaderboard
- **Waarde:** Bezoekers kunnen de QR-code scannen met hun telefoon en direct het leaderboard zien
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-02
- **Acceptatiecriteria:**
  - QR-code wordt gegenereerd op het beheerscherm
  - QR-code is downloadbaar als PNG
  - QR-code kan worden getoond op het grote scherm in kiosk-modus
- **Opmerkingen:**
  - Client-side generatie, geen server-belasting
  - Maakt fysieke delen op de club eenvoudig

---

### US-SPE-10 — Flight-filter op leaderboard

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik het leaderboard kan filteren op een specifieke flight
- **Waarde:** Ik kan snel de prestaties van een bepaalde groep spelers bekijken
- **Prioriteit:** C
- **Fase:** Later
- **Afhankelijk van:** US-SPE-04
- **Acceptatiecriteria:**
  - Dropdown of tabs met flight-namen boven het leaderboard
  - Bij selectie: alleen spelers uit die flight worden getoond
  "Alle flights" als standaard
  - URL blijft deelbaar; filter-parameter optioneel
- **Opmerkingen:**
  - Handig bij grotere toernooien met veel flights
  - Niet essentieel voor MVP met 4-6 flights

---

### US-SPE-11 — Realtime leaderboard via WebSockets

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat het leaderboard direct ververst zonder polling-interval
- **Waarde:** Ik zie scores binnen enkele seconden nadat ze zijn ingevoerd
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-03, technische infra
- **Acceptatiecriteria:**
  - WebSocket-verbinding voor live updates
  - Fallback naar polling als WebSocket niet beschikbaar is
  - Geen merkbare vertraging tussen score-invoer en leaderboard-update
- **Opmerkingen:**
  - Vereist Supabase Realtime of eigen WebSocket-server
  - MVP gebruikt polling (30 sec), wat ruim voldoende is voor de pilot

---

### US-SPE-12 — LIVE indicator op leaderboard

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik kan zien of het leaderboard live is (toernooi actief) of een archief toont
- **Waarde:** Ik weet of ik nieuwe updates kan verwachten
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Groene pulserende "LIVE" badge wanneer toernooi `active` is
  - "EINDUITSLA" of "AFGESLOTEN" label wanneer toernooi `finished` is
  - Badge is prominent maar niet storend
- **Opmerkingen:**
  - Geeft direct duidelijkheid over de status van het toernooi

---

### US-SPE-13a — Matchplay score per hole bijhouden

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik voor een matchplay-toernooi de uitslag per hole kan zien (gewonnen, gelijk, verloren)
- **Waarde:** Ik zie precies hoe de wedstrijd verloopt, hole-by-hole
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-ORG-01 (matchplay format)
- **Acceptatiecriteria:**
  - Per matchup: overzicht van alle holes met uitslag (gwn/gel/verl)
  - Huidige hole wordt uitgelicht tijdens actieve wedstrijd
  - Score staat weergegeven als "X & Y" (aantal gaten voor)

### US-SPE-13b — Matchplay leaderboard weergave

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat het leaderboard voor matchplay-toernooien de juiste kolommen toont en sorteert op wedstrijdpunten
- **Waarde:** Het leaderboard is relevant voor het gekozen formaat
- **Prioriteit:** S
- **Fase:** Later
- **Afhankelijk van:** US-SPE-13a, US-SPE-04
- **Acceptatiecriteria:**
  - Leaderboard toont kolommen: gwn, gel, verl, gaten voor
  - Sortering op wedstrijdpunten (niet op totaalslagen)
  - Automatisch schakelen tussen stroke/stableford/matchplay op basis van toernooiformat

---

### US-SPE-14a — Speler volgen op leaderboard

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik een specifieke speler kan selecteren om te volgen via een "Volg"-knop op het leaderboard
- **Waarde:** Ik kan mijn favoriete speler snel terugvinden zonder te zoeken
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-04
- **Acceptatiecriteria:**
  - "Volg"-knop per speler op het leaderboard
  - Gevolgde spelers worden bovenaan het leaderboard getoond of gemarkeerd
  - Maximaal 3 spelers tegelijk volgen
  - Opgeslagen in localStorage (geen account nodig)

### US-SPE-14b — Notificaties bij gevolgde speler

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik een browser-notificatie krijg als een gevolgde speler een birdie/eagle maakt of van positie verandert in de top 3
- **Waarde:** Ik hoef het leaderboard niet continu te verversen; ik word gewaarschuwd bij belangrijke gebeurtenissen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-14a
- **Acceptatiecriteria:**
  - Notificatie bij: birdie, eagle, positieverandering in top 3, ronde voltooid
  - Melding via browser-notificatie (toestemming vereist) of push
  - Toestemming wordt gevraagd volgens browser-richtlijnen

---

### US-SPE-15a — Leaderboard delen via social media

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik het leaderboard of een speler kan delen via de native share sheet van mijn telefoon
- **Waarde:** Ik kan het toernooi eenvoudig delen met vrienden
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Deel-knop op leaderboard-pagina opent native share sheet
  - Deel-knop per speler deelt link naar leaderboard met speler gemarkeerd
  - Gedeelde link werkt zonder account (publiek toegankelijk)

### US-SPE-15b — Emoji-reacties op scores

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik met een emoji kan reageren op een score (👏🔥💪)
- **Waarde:** Ik kan mijn waardering tonen zonder een reactie te typen
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Per speler op leaderboard: emoji-knoppen (👏🔥💪)
  - Aantal reacties wordt getoond als teller
  - Reacties zijn anoniem (geen account nodig)
  - Rate limiting: max 1 reactie per minuut per IP

### US-SPE-15c — Geschreven reacties met moderatie

- **Rol:** Toeschouwer van een toernooi
- **Doel:** Dat ik een tekstreactie kan achterlaten op het leaderboard, die na moderatie wordt getoond
- **Waarde:** Ik kan het toernooi actief becommentariëren
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Reactieveld onder het leaderboard
  - Account vereist om te reageren
  - Reacties worden pas getoond na moderatie (goedkeuring door organisator)
  - Organisator kan reacties verwijderen
  - Moderatie-scherm op beheerscherm van het toernooi

---

## Open vragen

| # | Vraag |
|---|---|
| SPE-O1 | Moet het leaderboard een donkere modus ondersteunen voor TV/projector weergave? |
| SPE-O2 | Hoeveel historie tonen we op het leaderboard (alleen huidige ronde, of ook vorige rondes bij meerdaagse toernooien)? |
