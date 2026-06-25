# Epic 08 — Premium en toekomst

## Epic beschrijving

Premium features die pas worden ontwikkeld nadat het product is bewezen en er gebruikersvraag is. Deze epics zijn geen MVP-vereiste maar een route naar verduurzaming.

## Rationale

In fase 1 ligt alle focus op groei en gebruikerstevredenheid. Premium features komen pas in fase 4 (zie roadmap). Het doel is om hostingkosten te dekken en het project duurzaam te maken, zonder de gratis kern aan te tasten. Premium is altijd een toevoeging, geen onthouding.

---

## User stories

### US-PRM-01 — White-label leaderboard met eigen branding

- **Rol:** Organisator van een club
- **Doel:** Dat ik het leaderboard kan tonen met het logo en de kleuren van mijn club
- **Waarde:** Het leaderboard voelt als een eigen club-oplossing, niet als een extern platform
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** US-SPE-01
- **Acceptatiecriteria:**
  - Uploaden van club-logo
  - Kleurenpalet instellen (primaire kleur, achtergrond, tekst)
  - Leaderboard toont branding in plaats van OpenTour-logo
  - Branding is consistent op leaderboard, exports en eventuele e-mails
  - Club kan de branding op elk moment wijzigen
- **Opmerkingen:**
  - Dit is de meest voor de hand liggende premium feature
  - Clubs hebben budget voor branding; zij zijn de betalende klant

---

### US-PRM-02 — Uitgebreide exports (PDF-scorecards)

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik de uitslag kan exporteren als een professioneel ogende PDF met scorecards per speler
- **Waarde:** Ik kan de uitslag printen, ophangen of mailen als officieel document
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** US-PRI-05 (CSV-export)
- **Acceptatiecriteria:**
  - PDF met: club-branding, toernooinaam, datum, uitslag
  - Optioneel: per speler een scorecard met scores per hole
  - Export in A4-formaat, geschikt voor print
  - Downloadbaar vanaf het beheerscherm
- **Opmerkingen:**
  - CSV-export (US-PRI-05) blijft gratis voor data-export
  - PDF met branding en lay-out is de premium-toevoeging

---

### US-PRM-03 — Sponsorblokken op leaderboard

- **Rol:** Organisator van een club
- **Doel:** Dat ik sponsor-logo's kan tonen op het leaderboard
- **Waarde:** Ik kan sponsorruimte verkopen aan lokale bedrijven, wat inkomsten genereert voor de club
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** US-PRM-01
- **Acceptatiecriteria:**
  - Uploaden van sponsor-logo's met link
  - Logos worden getoond op het leaderboard (boven of onder de ranglijst)
  - In kiosk-modus: logos rouleren of vast tonen
  - Maximaal aantal sponsors instelbaar
  - Sponsor-logo's zijn niet storend en beinvloeden de leesbaarheid niet
- **Opmerkingen:**
  - Sponsorinkomsten zijn een directe waardepropositie voor clubs
  - Advertenties zijn nooit zichtbaar voor spelers tijdens score-invoer (principe)

---

### US-PRM-04 — Eigen domein voor leaderboard

- **Rol:** Organisator van een club
- **Doel:** Dat ik het leaderboard kan tonen op een subdomein van mijn club (bijv. leaderboard.mijnclub.nl)
- **Waarde:** Het leaderboard is volledig onderdeel van de club-ervaring
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** US-PRM-01
- **Acceptatiecriteria:**
  - Club kan een CNAME-record instellen naar het platform
  - Leaderboard is bereikbaar via het eigen domein
  - SSL-certificaat wordt automatisch geregeld
  - Alle URLs (leaderboard, exports) werken onder het eigen domein
- **Opmerkingen:**
  - Technisch eenvoudig maar waardevol voor clubbeleving
  - Vereist beheerde hosting (US-PRM-06) of eigen DNS-configuratie

---

### US-PRM-05 — Extra analytics en clubstatistieken

- **Rol:** Organisator van een club
- **Doel:** Dat ik statistieken kan zien over al mijn toernooien: deelnemersaantallen, trends, populairste formaten
- **Waarde:** Ik krijg inzicht in het clubgebruik en kan beter plannen
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** US-AUTH-07 (meerdere organisatoren)
- **Acceptatiecriteria:**
  - Dashboard met: aantal toernooien, deelnemers, scores per maand
  - Grafieken: groei over tijd, populairste banen, formats
  - Export van statistieken als PDF-rapport
  - Filters op datum, type toernooi, baan
- **Opmerkingen:**
  - Waardevol voor clubbesturen die willen zien hoe het platform wordt gebruikt
  - Basistatistieken blijven gratis; uitgebreide analytics is premium

---

### US-PRM-06 — Beheerde hosting voor clubs

- **Rol:** Organisator van een club
- **Doel:** Dat ik het platform kan gebruiken zonder me zorgen te maken over hosting, updates of schaalbaarheid
- **Waarde:** Ik hoef geen technische kennis te hebben; het werkt gewoon
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** gehele platform
- **Acceptatiecriteria:**
  - Club krijgt een eigen instantie (of dedicated resources op gedeelde infra)
  - Updates worden automatisch uitgevoerd door het team
  - SLA op beschikbaarheid (bijv. 99.5% tijdens toernooitijden)
  - Priority support voor hosting-klanten
  - Data blijft van de club; export altijd mogelijk
- **Opmerkingen:**
  - Dit is de belangrijkste potentiële inkomstenstroom
  - Self-hosting blijft gratis; beheerde hosting is het betaalde alternatief
  - Prijsstelling: vast bedrag per maand, afhankelijk van aantal toernooien

---

### US-PRM-07 — Prioriteitsondersteuning

- **Rol:** Organisator van een toernooi
- **Doel:** Dat ik tijdens een toernooi snel hulp kan krijgen als er iets misgaat
- **Waarde:** Ik kan rekenen op snelle respons als het er echt toe doet
- **Prioriteit:** L
- **Fase:** Premium (fase 4)
- **Afhankelijk van:** geen
- **Acceptatiecriteria:**
  - Toegang tot een priority support-kanaal (telefoon of speciale chat)
  - Reactietijd binnen 30 minuten tijdens toernooitijden (weekendochtenden)
  - Dedicated contactpersoon voor grote clubs
  - KB-artikelen en FAQ voor self-service (gratis voor iedereen)
- **Opmerkingen:**
  - Gratis support via GitHub Issues/documentatie blijft bestaan
  - Priority support is voor organisatoren die afhankelijk zijn van het platform voor hun toernooi

---

## Premium vs gratis overzicht

| Feature | Gratis | Premium |
|---|---|---|
| Toernooi aanmaken | Ja | Ja |
| Score invoeren | Ja | Ja |
| Leaderboard | Ja | Ja |
| Data-export JSON (API) | Ja | Ja |
| White-label branding | Nee | Ja |
| PDF-scorecards | Nee | Ja |
| Sponsorblokken | Nee | Ja |
| Eigen domein | Nee | Ja |
| Geavanceerde analytics | Nee | Ja |
| Beheerde hosting | Nee | Ja |
| Priority support | Nee | Ja |
| Self-hosting | Ja | Niet van toepassing |

---

## Open vragen

| # | Vraag |
|---|---|
| PRM-O1 | Wat is een eerlijke prijs voor beheerde hosting? (Te bepalen na pilot op basis van werkelijke kosten.) |
| PRM-O2 | Moeten premium features per stuk worden aangeboden of als pakket? (Pakketadvies: club-pakket met branding + domein + sponsorblokken.) |
| PRM-O3 | Hoe voorkomen we dat de community het gevoel krijgt dat we "vercommercialiseren"? Door altijd eerst de gratis functies te verbeteren en premium als optionele toevoeging te positioneren. |
