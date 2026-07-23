# Leaderboard Functionaliteit

## Overzicht
De leaderboard-functionaliteit toont de ranglijst van spelers in een toernooi, gebaseerd op stableford-punten (netto/gross) of strokeplay-scores. De data wordt opgehaald uit de `tournament_leaderboard`-view in Supabase en weergegeven in de frontend via een herbruikbare `LeaderboardTable`-component.

## Backend: Database View
De `tournament_leaderboard`-view in Supabase berekent automatisch:
- **Stableford-punten** (netto en gross)
- **Totale slagen** (netto en gross)
- **Posities** (gesorteerd op score, met speciale behandeling voor DNS/DNF/DSQ)
- **Ronde-scores** (per ronde, als JSON-array)
- **Vandaag-score** (score van de huidige ronde)

### Query-voorbeeld
```sql
SELECT * FROM tournament_leaderboard
WHERE tournament_id = 'jouw-toernooi-id'
ORDER BY position ASC;
```

### Velden in de view
| Veld                     | Type      | Beschrijving                                                                 |
|--------------------------|-----------|------------------------------------------------------------------------------|
| `player_id`              | UUID      | Unieke identifier van de speler                                              |
| `player_name`            | Text      | Naam van de speler                                                           |
| `handicap`               | Integer   | Handicap van de speler                                                       |
| `position`               | Integer   | Huidige positie in het toernooi                                              |
| `gross_stableford_points`| Integer   | Totaal aantal stableford-punten (gross)                                      |
| `net_stableford_points`  | Integer   | Totaal aantal stableford-punten (netto)                                      |
| `total_strokes`          | Integer   | Totaal aantal slagen (gross)                                                 |
| `total_net_strokes`      | Integer   | Totaal aantal slagen (netto)                                                 |
| `score_to_par`           | Integer   | Totale score t.o.v. par (gross)                                              |
| `net_score_to_par`       | Integer   | Totale score t.o.v. par (netto)                                              |
| `holes_played`           | Integer   | Aantal gespeelde holes                                                       |
| `today_score`            | Integer   | Score van de huidige ronde (to_par)                                          |
| `today_holes`            | Integer   | Aantal gespeelde holes in de huidige ronde                                   |
| `round_scores`           | Integer[] | Array met scores per ronde (strokes)                                         |
| `round_to_par`           | Integer[] | Array met scores per ronde (to_par)                                          |
| `started_on_hole`        | Integer   | Hole waarop de speler is gestart (voor shotgun-start)                        |
| `flight_name`            | Text      | Naam van de flight (indien van toepassing)                                   |
| `flight_sort_order`      | Integer   | Sorteervolgorde van de flight                                                |

## Frontend: Componenten
### `LeaderboardTable`
- **Locatie**: `apps/web/components/leaderboard/LeaderboardTable.tsx`
- **Verantwoordelijkheid**: Weergeven van de leaderboard-data in een tabel met:
  - Positie, speler, handicap, thru, vandaag-score, ronde-scores, totale score
  - Ondersteuning voor stableford (netto/gross) en strokeplay
  - Kleurcodering voor scores (rood/groen)
  - Uitklapbare scorecard voor details per speler

### `LeaderboardClient`
- **Locatie**: `apps/web/components/leaderboard/LeaderboardClient.tsx`
- **Verantwoordelijkheid**:
  - Data ophalen via `fetchLeaderboardData`
  - Filteren op zoekterm, flight, favorieten
  - Polling voor live-updates (elke 30 seconden)
  - Tab-navigatie (Leaderboard, Tee Times, Matchplay, Course Stats)

### Data Fetching
- **Locatie**: `apps/web/lib/fetchLeaderboard.ts`
- **Functie**: `fetchLeaderboardData(tournamentId: string)`
- **Query**: Haalt data op uit de `tournament_leaderboard`-view via Supabase REST API:
  ```ts
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tournament_leaderboard?tournament_id=eq.${tournamentId}&order=position.asc`;
  ```

## Gebruik
### Leaderboard weergeven
```tsx
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';

<LeaderboardClient
  tournamentId="jouw-toernooi-id"
  tournamentName="Toernooi Naam"
  format="stableford" // of "stroke"
  scoringType="net" // of "gross"
  isActive={true}
  status="in_progress"
  rounds={2}
  competitionType="single" // of "ladder", "matchplay"
/>
```

### Filteren en sorteren
- **Zoeken**: Typ een naam in de zoekbalk.
- **Flight**: Selecteer een flight uit het dropdown-menu.
- **Favorieten**: Klik op de ster om spelers toe te voegen/verwijderen uit favorieten.
- **Ronde**: Selecteer een ronde om alleen die ronde te tonen (indien van toepassing).

## Live Updates
De leaderboard pollt automatisch elke **30 seconden** voor nieuwe data als het toernooi actief is (`isActive={true}`). Dit gebeurt via de `fetchLeaderboardData`-functie.

## Aanpassingen
### Nieuwe scoringstypen toevoegen
1. Breid de `formatScore`- en `scoreColor`-functies in `LeaderboardTable.tsx` uit.
2. Voeg logica toe aan de `tournament_leaderboard`-view indien nodig.

### Nieuwe kolommen toevoegen
1. Voeg het veld toe aan de `tournament_leaderboard`-view.
2. Voeg een kolom toe aan de tabel in `LeaderboardTable.tsx`.
3. Werk de `LeaderboardEntry`-type definitie bij in `@opentour/types`.

## Troubleshooting
- **Geen data**: Controleer of het toernooi-id correct is en of er scores zijn ingevoerd.
- **CORS-fouten**: Zorg dat de Supabase-URL en anon-key correct zijn ingesteld in `.env.local`.
- **Type-fouten**: Werk de types bij in `@opentour/types` als je velden toevoegt/verandert.