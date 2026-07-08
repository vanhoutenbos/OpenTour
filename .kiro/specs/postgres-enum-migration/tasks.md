# Implementation Plan: postgres-enum-migration

## Overview

De implementatie bestaat uit drie opeenvolgende stappen: (1) het SQL-migratiescript aanmaken, (2) `database.types.ts` handmatig bijwerken, en (3) `packages/types/src/index.ts` bijwerken. Elke stap bouwt voort op de vorige. Het script is één atomische transactie — alle wijzigingen slagen of worden teruggerold.

## Tasks

- [x] 1. Schrijf het SQL-migratiescript `20260708140000_enum_migration.sql`
  - Maak het bestand aan op `supabase/migrations/20260708140000_enum_migration.sql`
  - Omsluit het volledige script met `BEGIN;` en `COMMIT;`
  - _Requirements: 3.4_

  - [x] 1.1 Voeg Stap 1 toe: aanmaken van de 10 ENUM-types met duplicate_object guard
    - Gebruik het `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;` patroon voor elk type
    - Volgorde: `tournament_format`, `scoring_type`, `tournament_status`, `player_status`, `gender_binary`, `gender_category`, `loop_type`, `user_role`, `course_source`, `language`
    - Alle 10 types moeten vóór de eerste `ALTER TABLE … ALTER COLUMN` staan
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 4.13_

  - [x] 1.2 Voeg Stap 2 toe: pre-flight validatie voor alle 12 kolommen
    - Schrijf een `DO $$` blok dat vóór enige `ALTER COLUMN` alle 12 kolommen controleert op waarden buiten de doelset
    - Gebruik `RAISE EXCEPTION` met tabelnaam, rij-id's en ongeldige waarden als er treffer is
    - Behandelde kolommen: `tees.gender`, `tournament_players.gender`, `tournament_categories.gender`, `tournament_tees.gender`, `tournaments.format`, `tournaments.scoring_type`, `tournaments.status`, `tournament_players.status`, `loops.loop_type`, `profiles.role`, `courses.source`, `profiles.language`
    - _Requirements: 2.4, 3.5, 4.14_

  - [ ]* 1.3 Schrijf property test: Property 4 — Atomiciteit bij validatiefout
    - **Property 4: Atomiciteit bij validatiefout**
    - Voeg een testbestand toe (bijv. `supabase/tests/enum_migration.test.sql` of TypeScript equivalent) dat één rij met een ongeldige waarde in een testdatabase injecteert, daarna het migratiescript in `BEGIN … ROLLBACK` uitvoert, en daarna verifieert dat alle kolommen nog van het type `TEXT` zijn
    - **Validates: Requirements 3.4, 3.5, 2.4**

  - [x] 1.4 Voeg Stap 3 toe: ALTER COLUMN TYPE voor alle 12 kolommen
    - Schrijf alle 12 `ALTER TABLE … ALTER COLUMN … TYPE … USING …::…` statements in de volgorde uit het design
    - Gebruik de exacte USING-cast syntax: `USING <kolom>::public.<enum_type>`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [ ]* 1.5 Schrijf property test: Property 1 — Roundtrip-eigenschap
    - **Property 1: Roundtrip-eigenschap**
    - Schrijf een test die voor elke ENUM-type alle geldige waarden injecteert als TEXT, het migratiescript uitvoert op een test-database, en verifieert dat elke waarde na de conversie ongewijzigd teruggegeven wordt
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 1.6 Schrijf property test: Property 2 — NULL-behoud
    - **Property 2: NULL-behoud**
    - Schrijf een test die rijen met NULL-waarden in nullable ENUM-kolommen aanmaakt, daarna het script uitvoert, en verifieert dat de NULL-waarden intact zijn gebleven
    - **Validates: Requirements 2.3, 3.1**

  - [x] 1.7 Voeg Stap 4 toe: DROP CONSTRAINT IF EXISTS voor de 11 CHECK-constraints
    - Schrijf 11 `ALTER TABLE … DROP CONSTRAINT IF EXISTS <naam>` statements
    - Gebruik de constraint-namen zoals gedocumenteerd in het design (patroon `<tabel>_<kolom>_check`)
    - `tournament_players.gender` heeft geen constraint en krijgt geen DROP statement
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 1.8 Voeg Stap 5 toe: update van de trigger-functie `freeze_tournament_course_snapshot`
    - Schrijf `CREATE OR REPLACE FUNCTION freeze_tournament_course_snapshot()` met de `gender`-kopieerlogica
    - Gebruik de `te.gender::text::public.gender_category` dubbele cast voor de ENUM-naar-ENUM conversie
    - _Requirements: 2.5_

  - [ ]* 1.9 Schrijf property test: Property 6 — Trigger-correctheid
    - **Property 6: Trigger-correctheid**
    - Schrijf een test die een toernooi van `draft` naar `active` zet en daarna verifieert dat `tournament_tees.gender` de waarden `'male'`, `'female'` en `NULL` correct overeeft van `tees.gender`
    - **Validates: Requirements 2.5**

  - [x] 1.10 Voeg Stap 6 toe: uitbreidbaarheids-commentaarsectie
    - Voeg een SQL-commentaarblok toe met de sectietitel "Uitbreidbaarheid"
    - Documenteer: (a) exact SQL voor `ALTER TYPE … ADD VALUE`, inclusief een concreet voorbeeld voor `public.tournament_status`; (b) de drie-stappen-procedure voor het verwijderen of hernoemen van een ENUM-waarde
    - _Requirements: 7.1, 7.2_

- [x] 2. Checkpoint — Valideer het migratiescript
  - Voer het script handmatig uit met `BEGIN; … ROLLBACK;` op een lokale Supabase-instantie om te controleren dat het foutloos loopt
  - Controleer via `information_schema.columns` of alle 12 kolommen na de rollback nog `TEXT` zijn
  - Zorg dat alle tests uit de vorige stap slagen. Stel vragen aan de gebruiker als er onduidelijkheden zijn.

- [x] 3. Werk `packages/supabase/src/database.types.ts` handmatig bij
  - Voeg een `Enums`-sectie toe aan de `Database['public']` interface met alle 10 ENUM-types als string-literal union-types
  - _Requirements: 6.1_

  - [x] 3.1 Voeg de `Enums`-sectie toe
    - Voeg onder `Functions` de sectie `Enums` toe met alle 10 types als string-literal unions:
      - `tournament_format: 'strokeplay' | 'stableford' | 'matchplay'`
      - `scoring_type: 'gross' | 'net'`
      - `tournament_status: 'draft' | 'active' | 'paused' | 'finished'`
      - `player_status: 'registered' | 'confirmed' | 'withdrawn' | 'dns' | 'dnf' | 'dsq'`
      - `gender_binary: 'male' | 'female'`
      - `gender_category: 'male' | 'female' | 'mixed'`
      - `loop_type: 'full_18' | 'front_9' | 'back_9' | 'custom'`
      - `user_role: 'organizer' | 'recorder'`
      - `course_source: 'egolf4u' | 'custom' | 'community'`
      - `language: 'nl' | 'en'`
    - _Requirements: 6.1_

  - [x] 3.2 Werk alle kolomtypes in de `Tables`-sectie bij
    - Vervang inline string-literal unions door de juiste `Database['public']['Enums'][…]` referenties, of pas de waarden direct aan zodat ze overeenkomen met de ENUM-definities
    - Betrokken kolommen: `tees.gender` (`gender_binary | null`), `tournament_tees.gender` (`gender_category | null`), `tournament_categories.gender` (`gender_category | null`), `tournament_players.gender` (`gender_binary | null`), en de overige 8 ENUM-kolommen
    - _Requirements: 6.1_

  - [ ]* 3.3 Schrijf property test: Property 3 — Afwijzing van ongeldige waarden
    - **Property 3: Afwijzing van ongeldige waarden**
    - Schrijf een test die ongeldige waarden (bijv. `'mixed'` op een `gender_binary`-kolom, `'other'` op elk ENUM-type) probeert te INSERT-en en verifieert dat PostgreSQL antwoordt met foutcode `22P02`
    - **Validates: Requirements 7.4**

  - [ ]* 3.4 Schrijf property test: Property 5 — Idempotentie
    - **Property 5: Idempotentie**
    - Schrijf een test die het migratiescript twee keer uitvoert op een test-database en verifieert dat de tweede uitvoering geen fout geeft (ENUM-guard en `DROP … IF EXISTS` zijn no-ops)
    - **Validates: Requirements 1.1–1.10, 5.4**

- [x] 4. Werk `packages/types/src/index.ts` bij
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 4.1 Verwijder het bestaande `Gender`-type en voeg `GenderBinary` en `GenderCategory` toe
    - Verwijder: `export type Gender = 'male' | 'female' | 'mixed';`
    - Voeg toe:
      ```typescript
      export type GenderBinary   = 'male' | 'female';
      export type GenderCategory = 'male' | 'female' | 'mixed';
      ```
    - _Requirements: 6.3_

  - [x] 4.2 Voeg `gender: GenderBinary | null` toe aan de `Tee`-interface
    - Voeg het veld `gender: GenderBinary | null;` toe aan de `Tee`-interface (na `course_rating`)
    - _Requirements: 6.4_

  - [x] 4.3 Voeg `gender: GenderCategory | null` toe aan de `TournamentTee`-interface
    - Voeg het veld `gender: GenderCategory | null;` toe aan de `TournamentTee`-interface (na `course_rating`)
    - _Requirements: 6.4_

  - [x] 4.4 Werk `TournamentCategory.gender` bij van `Gender` naar `GenderCategory`
    - Wijzig: `gender?: Gender;` → `gender?: GenderCategory;`
    - _Requirements: 6.2_

  - [x] 4.5 Werk `TournamentPlayer.gender` bij van `Gender` naar `GenderBinary`
    - Wijzig: `gender?: Gender;` → `gender?: GenderBinary;`
    - _Requirements: 6.5_

- [ ] 5. Finale checkpoint — TypeScript-compilatie en volledige test-run
  - Voer `pnpm build` uit in de root van de monorepo en los alle TypeScript-compilatiefouten op die ontstaan door de `Gender`-split
  - Controleer dat er geen referenties naar het verwijderde `Gender`-type meer bestaan in `apps/web` of andere packages
  - Zorg dat alle tests slagen. Stel vragen aan de gebruiker als er onduidelijkheden zijn.

## Notes

- Taken gemarkeerd met `*` zijn optioneel en kunnen worden overgeslagen voor een snellere MVP
- De `assign_player_category`-functie in de database hoeft **niet** te worden aangepast — PostgreSQL cast een `TEXT`-parameter impliciet naar een ENUM
- `supabase gen types typescript` kan in deze omgeving niet automatisch draaien; `database.types.ts` wordt daarom handmatig bijgewerkt (taak 3)
- Voer het migratiescript altijd eerst met `BEGIN; … ROLLBACK;` uit (dry-run) voordat het definitief wordt doorgevoerd
- De property tests in taken 1.3, 1.5, 1.6, 1.9, 3.3 en 3.4 valideren de zes correctness properties uit het design document

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "3.1", "3.2", "3.3", "3.4"] },
    { "wave": 4, "tasks": ["4", "4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "wave": 5, "tasks": ["5"] }
  ]
}
```
