# Implementatieplan: postgres-enum-migration

## Overzicht

Migreer alle `TEXT + CHECK constraint`-kolommen in de OpenTour PostgreSQL-database naar native PostgreSQL ENUM-types, los de gender-inconsistentie op, update de snapshot-trigger en synchroniseer de TypeScript-types. De uitvoering bestaat uit drie opeenvolgende stappen: (1) SQL-migratiescript, (2) type-regeneratie via Supabase CLI, (3) handmatige TypeScript-update.

## Taken

- [ ] 1. Schrijf het SQL-migratiescript
  - [ ] 1.1 Maak het migratiebestand aan met BEGIN/COMMIT-wrapper en ENUM-aanmaak
    - Maak `supabase/migrations/20260708140000_enum_migration.sql` aan
    - Omsluit de volledige migratie in `BEGIN; … COMMIT;`
    - Voeg Stap 1 toe: alle 10 ENUM-types aanmaken met `DO $$ BEGIN CREATE TYPE … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
    - Types: `tournament_format`, `scoring_type`, `tournament_status`, `player_status`, `gender_binary`, `gender_category`, `loop_type`, `user_role`, `course_source`, `language`
    - _Requirements: 1.1 t/m 1.11_

  - [ ] 1.2 Voeg pre-flight validatie toe voor alle 12 gemigreerde kolommen
    - Voeg Stap 2 toe: `DO $$ DECLARE v_count INT; v_detail TEXT; BEGIN … END $$;` blok dat vóór enige `ALTER TABLE` ongeldige waarden detecteert
    - Controleer elke kolom op waarden die niet in de ENUM-set passen en niet NULL zijn
    - Breek de transactie af met `RAISE EXCEPTION` bij treffer, inclusief tabelnaam, rij-id en ongeldige waarde
    - _Requirements: 2.4, 3.5, 4.14_

  - [ ] 1.3 Voeg de 12 ALTER COLUMN TYPE statements toe
    - Voeg Stap 3 toe: alle `ALTER TABLE … ALTER COLUMN … TYPE public.<enum> USING <kolom>::public.<enum>` statements
    - Volgorde: `profiles.language`, `profiles.role`, `courses.source`, `tournaments.format`, `tournaments.scoring_type`, `tournaments.status`, `tournament_players.status`, `tournament_players.gender` (→ `gender_binary`), `tournament_categories.gender` (→ `gender_category`), `tournament_tees.gender` (→ `gender_category`), `tees.gender` (→ `gender_binary`), `loops.loop_type`
    - _Requirements: 2.1, 2.2, 3.1, 4.1 t/m 4.12_

  - [ ] 1.4 Voeg de DROP CONSTRAINT IF EXISTS statements toe
    - Voeg Stap 4 toe: verwijder alle 11 bijbehorende CHECK-constraints via `ALTER TABLE … DROP CONSTRAINT IF EXISTS <naam>`
    - Constraint-namen conform het patroon `<tabel>_<kolom>_check` (zie design-tabel)
    - Sla `tournament_players.gender` over (had geen CHECK-constraint)
    - _Requirements: 3.2, 5.1 t/m 5.5_

  - [ ] 1.5 Update de `freeze_tournament_course_snapshot`-triggerfunctie
    - Voeg Stap 5 toe: `CREATE OR REPLACE FUNCTION freeze_tournament_course_snapshot()` met de `gender`-kolom in de INSERT naar `tournament_tees`
    - Gebruik de dubbele cast `te.gender::text::public.gender_category` om van `gender_binary` naar `gender_category` te converteren
    - _Requirements: 2.5_

  - [ ]* 1.6 Schrijf een property-based test voor roundtrip-eigenschap (Property 1)
    - **Property 1: Roundtrip-eigenschap**
    - Verifieer voor elke geldige ENUM-waarde dat een INSERT-als-tekst gevolgd door SELECT terug als ENUM exact dezelfde waarde oplevert
    - Test alle 10 ENUM-types met al hun geldige waarden
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 1.7 Schrijf een property-based test voor NULL-behoud (Property 2)
    - **Property 2: NULL-behoud**
    - Verifieer dat een NULL-waarde in een TEXT-kolom NULL blijft na ENUM-migratie via `USING`-cast
    - Test voor `tees.gender`, `tournament_players.gender`, `tournament_categories.gender`, `tournament_tees.gender`
    - **Validates: Requirements 2.3, 3.1**

- [ ] 2. Voeg de uitbreidbaarheidsdocumentatie toe en valideer het script
  - [ ] 2.1 Voeg de commentaarsectie "Uitbreidbaarheid" toe aan het migratiescript
    - Voeg Stap 6 toe als SQL-commentaarblok onderaan het script
    - Documenteer `ALTER TYPE <type_name> ADD VALUE '<nieuwe_waarde>'` met een concreet voorbeeld
    - Documenteer de drie stappen voor verwijderen/hernoemen van ENUM-waarden
    - _Requirements: 7.1, 7.2_

  - [ ]* 2.2 Schrijf een property-based test voor afwijzing van ongeldige waarden (Property 3)
    - **Property 3: Afwijzing van ongeldige waarden**
    - Verifieer dat INSERT/UPDATE op een ENUM-kolom met een ongeldige waarde foutcode `22P02` geeft
    - Test `'mixed'` op `gender_binary`, `'other'` op elk ENUM-type, lege string op elk type
    - **Validates: Requirements 7.4**

  - [ ]* 2.3 Schrijf een property-based test voor atomiciteit (Property 4)
    - **Property 4: Atomiciteit bij validatiefout**
    - Simuleer een ongeldige rij in één tabel, voer het script uit, verifieer dat alle kolommen nog steeds TEXT zijn (geen partiële migratie)
    - **Validates: Requirements 3.4, 3.5, 2.4**

  - [ ]* 2.4 Schrijf een property-based test voor idempotentie (Property 5)
    - **Property 5: Idempotentie**
    - Voer het migratiescript twee keer uit en verifieer dat de tweede uitvoering geen fout geeft
    - **Validates: Requirements 1.1, 5.4**

- [ ] 3. Checkpoint — Valideer het migratiescript vóór TypeScript-wijzigingen
  - Voer een dry-run uit met `BEGIN; … ROLLBACK;` op een lokale Supabase-instantie: `supabase db reset && supabase db push`
  - Controleer via `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public'` dat alle 12 kolommen `USER-DEFINED` als `data_type` tonen
  - Controleer via `SELECT * FROM pg_enum` dat alle ENUM-types de juiste waarden bevatten
  - Vraag de gebruiker om feedback als er problemen zijn.

- [ ] 4. Regenereer `database.types.ts` via Supabase CLI
  - [ ] 4.1 Update `packages/supabase/src/database.types.ts` na type-regeneratie
    - Voer `supabase gen types typescript --project-id <id>` uit (of pas het bestand handmatig aan op basis van de nieuwe ENUM-types)
    - Verifieer dat de `Enums`-sectie aanwezig is met alle 10 ENUM-types
    - Verifieer dat `tees.gender` het type `'male' | 'female' | null` heeft (gender_binary)
    - Verifieer dat `tournament_tees.gender` het type `'male' | 'female' | 'mixed' | null` heeft (gender_category)
    - Verifieer dat `tournament_players.gender` het type `'male' | 'female' | null` heeft (gender_binary)
    - Verifieer dat `tournament_categories.gender` het type `'male' | 'female' | 'mixed' | null` heeft (gender_category)
    - _Requirements: 6.1_

- [ ] 5. Update `packages/types/src/index.ts`
  - [ ] 5.1 Vervang `Gender` door `GenderBinary` en `GenderCategory`
    - Verwijder `export type Gender = 'male' | 'female' | 'mixed';`
    - Voeg toe: `export type GenderBinary = 'male' | 'female';`
    - Voeg toe: `export type GenderCategory = 'male' | 'female' | 'mixed';`
    - _Requirements: 6.2, 6.3_

  - [ ] 5.2 Update de `Tee`-interface met het `gender`-veld
    - Voeg het veld `gender: GenderBinary | null;` toe aan de `Tee`-interface (was afwezig)
    - _Requirements: 6.4_

  - [ ] 5.3 Update de `TournamentTee`-interface met het `gender`-veld
    - Voeg het veld `gender: GenderCategory | null;` toe aan de `TournamentTee`-interface (was afwezig)
    - _Requirements: 6.4_

  - [ ] 5.4 Update de `TournamentCategory`- en `TournamentPlayer`-interfaces
    - Wijzig in `TournamentCategory`: `gender?: GenderCategory;` (was: `Gender`)
    - Wijzig in `TournamentPlayer`: `gender?: GenderBinary;` (was: `Gender`)
    - _Requirements: 6.4, 6.5_

  - [ ]* 5.5 Schrijf een property-based test voor trigger-correctheid (Property 6)
    - **Property 6: Trigger-correctheid**
    - Verifieer dat bij statusovergang `draft → active` de waarden `'male'` en `'female'` van `tees.gender` correct worden gekopieerd naar `tournament_tees.gender` als `gender_category`
    - Verifieer dat NULL als NULL bewaard blijft
    - **Validates: Requirements 2.5**

- [ ] 6. Valideer TypeScript-compilatie en zoek verwijzingen naar het oude `Gender`-type
  - [ ] 6.1 Vervang alle resterende verwijzingen naar `Gender` door `GenderBinary` of `GenderCategory`
    - Zoek in de gehele codebase naar gebruik van het `Gender`-type (bijv. in componenten, hooks, API-routes)
    - Vervang elke verwijzing door het juiste specifieke type op basis van de context (tee/speler → `GenderBinary`, categorie → `GenderCategory`)
    - _Requirements: 6.2, 6.3, 6.5_

  - [ ] 6.2 Voer `pnpm build` uit en los TypeScript-compilatiefouten op
    - Voer `pnpm build` uit vanuit de workspace-root
    - Los alle type-fouten op die voortkomen uit de `Gender`-splitsing
    - _Requirements: 6.1, 6.2_

- [ ] 7. Eindcheckpoint — Alle tests slagen en de build is schoon
  - Verifieer dat `pnpm build` slaagt zonder fouten
  - Controleer dat het migratiescript volledig idempotent is door het opnieuw toe te passen op de lokale database
  - Vraag de gebruiker om feedback als er openstaande vragen zijn.

## Notities

- Taken gemarkeerd met `*` zijn optioneel en kunnen worden overgeslagen voor een snellere MVP
- De SQL-migratie moet altijd vóór de TypeScript-wijzigingen worden uitgevoerd
- `supabase gen types typescript` moet handmatig worden uitgevoerd na `supabase db push`; dit kan niet geautomatiseerd worden in dit script
- De dubbele cast `::text::public.gender_category` in de trigger is noodzakelijk omdat PostgreSQL geen directe ENUM-naar-ENUM cast ondersteunt
- Controleer constraint-namen via `SELECT conname FROM pg_constraint WHERE conrelid = '<tabel>'::regclass` als `DROP CONSTRAINT IF EXISTS` geen effect heeft

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["1.6", "1.7", "2.1"] },
    { "id": 5, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 9, "tasks": ["5.5", "6.1"] },
    { "id": 10, "tasks": ["6.2"] }
  ]
}
```
