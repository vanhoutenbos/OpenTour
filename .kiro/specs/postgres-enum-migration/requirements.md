# Requirements Document

## Introduction

De OpenTour applicatie gebruikt momenteel `TEXT + CHECK constraint` voor alle geconstrained kolommen in de PostgreSQL-database. Deze feature migreert die kolommen naar native PostgreSQL ENUM types, en lost tegelijkertijd een inconsistentie op in de `gender`-definitie (twee vs. drie waarden). Na de migratie worden `database.types.ts` en `packages/types/src/index.ts` gesynchroniseerd zodat de TypeScript-types exact overeenkomen met de database-enums.

## Glossary

- **Migration**: Een Supabase-migratiescript (`.sql`-bestand in `supabase/migrations/`) dat het databaseschema atomisch wijzigt.
- **ENUM type**: Een PostgreSQL-type aangemaakt via `CREATE TYPE ... AS ENUM (...)` met een vaste, geordende reeks toegestane waarden.
- **CHECK constraint**: Een bestaande PostgreSQL-beperking op een TEXT-kolom die alleen bepaalde string-waarden toestaat.
- **Backwards compatibility**: Bestaande rijen in de database behouden hun waarde na de migratie; geen data-verlies.
- **database.types.ts**: Het gegenereerde Supabase-type bestand in `packages/supabase/src/database.types.ts`.
- **Shared Types**: Het handmatig onderhouden bestand `packages/types/src/index.ts` met de gedeelde TypeScript union-types.
- **Type_Sync**: Het proces van het hergeneren van `database.types.ts` via `supabase gen types typescript` na een schemawijziging, gevolgd door het handmatig bijwerken van `packages/types/src/index.ts`.
- **gender_binary**: De enum voor kolommen die alleen `'male'` en `'female'` accepteren (`tees.gender`, `tournament_players.gender`).
- **gender_category**: De enum voor kolommen die `'male'`, `'female'` én `'mixed'` accepteren (`tournament_categories.gender`, `tournament_tees.gender`).
- **Migration_Script**: Eén `.sql`-bestand dat één logische migratiestap uitvoert.
- **Organizer**: Een gebruiker met de rol `organizer` die toernooien beheert.

## Requirements

### Requirement 1: Aanmaken van PostgreSQL ENUM types

**User Story:** Als database-administrator, wil ik dat alle geconstrained TEXT-kolommen worden vervangen door native PostgreSQL ENUM types, zodat de database zelf de domeinintegriteit afdwingt en Supabase type-generatie de juiste TypeScript-typen produceert.

#### Acceptance Criteria

1. THE Migration_Script SHALL een `CREATE TYPE public.tournament_format AS ENUM ('strokeplay', 'stableford', 'matchplay')` statement bevatten, gecombineerd met `IF NOT EXISTS` of een equivalente guard zodat heruitvoering geen fout geeft.
2. THE Migration_Script SHALL een `CREATE TYPE public.scoring_type AS ENUM ('gross', 'net')` statement bevatten met `IF NOT EXISTS` guard.
3. THE Migration_Script SHALL een `CREATE TYPE public.tournament_status AS ENUM ('draft', 'active', 'paused', 'finished')` statement bevatten met `IF NOT EXISTS` guard.
4. THE Migration_Script SHALL een `CREATE TYPE public.player_status AS ENUM ('registered', 'confirmed', 'withdrawn', 'dns', 'dnf', 'dsq')` statement bevatten met `IF NOT EXISTS` guard.
5. THE Migration_Script SHALL een `CREATE TYPE public.gender_binary AS ENUM ('male', 'female')` statement bevatten met `IF NOT EXISTS` guard.
6. THE Migration_Script SHALL een `CREATE TYPE public.gender_category AS ENUM ('male', 'female', 'mixed')` statement bevatten met `IF NOT EXISTS` guard.
7. THE Migration_Script SHALL een `CREATE TYPE public.loop_type AS ENUM ('full_18', 'front_9', 'back_9', 'custom')` statement bevatten met `IF NOT EXISTS` guard.
8. THE Migration_Script SHALL een `CREATE TYPE public.user_role AS ENUM ('organizer', 'recorder')` statement bevatten met `IF NOT EXISTS` guard.
9. THE Migration_Script SHALL een `CREATE TYPE public.course_source AS ENUM ('egolf4u', 'custom', 'community')` statement bevatten met `IF NOT EXISTS` guard.
10. THE Migration_Script SHALL een `CREATE TYPE public.language AS ENUM ('nl', 'en')` statement bevatten met `IF NOT EXISTS` guard.
11. THE Migration_Script SHALL alle `CREATE TYPE` statements plaatsen vóór enige `ALTER TABLE … ALTER COLUMN` statement die het betreffende type gebruikt, zodat er geen forward-reference fouten optreden.

---

### Requirement 2: Oplossen van gender-inconsistentie

**User Story:** Als ontwikkelaar, wil ik dat de `gender`-definitie consistent is door het systeem heen, zodat er geen ambiguïteit bestaat over welke waarden geldig zijn per kolom.

#### Acceptance Criteria

1. THE Migration_Script SHALL `public.gender_binary` (`'male'` of `'female'`) toepassen op de kolommen `tees.gender` en `tournament_players.gender` via een `ALTER TABLE … ALTER COLUMN … TYPE public.gender_binary USING gender::public.gender_binary` statement.
2. THE Migration_Script SHALL `public.gender_category` (`'male'`, `'female'` of `'mixed'`) toepassen op de kolommen `tournament_categories.gender` en `tournament_tees.gender` via een `ALTER TABLE … ALTER COLUMN … TYPE public.gender_category USING gender::public.gender_category` statement; hierbij wordt de bestaande CHECK constraint (`'male'`, `'female'`) vervangen door het ruimere ENUM-type.
3. WHEN een bestaande rij in `tournament_tees`, `tournament_categories`, `tees` of `tournament_players` de waarde `NULL` heeft voor `gender`, THEN THE Migration_Script SHALL de `NULL`-waarde ongewijzigd laten en de rij niet afwijzen.
4. IF een bestaande rij in `tees` of `tournament_players` een waarde bevat die niet `'male'` of `'female'` is en ook niet `NULL`, THEN THE Migration_Script SHALL de migratie afbreken met een foutmelding die de tabelnaam, de rij-id en de ongeldige waarde vermeldt, vóórdat enige kolomconversie is uitgevoerd.
5. THE Migration_Script SHALL de `freeze_tournament_course_snapshot` trigger-functie bijwerken zodat deze ook `gender` kopieert van `tees` naar `tournament_tees` bij de overgang `draft → active`.

---

### Requirement 3: Backwards-compatibele kolommigratie

**User Story:** Als database-administrator, wil ik dat alle bestaande rijen hun huidige waarden behouden na de migratie naar ENUM-kolommen, zodat er geen dataverlies optreedt.

#### Acceptance Criteria

1. WHEN de Migration_Script wordt uitgevoerd op de kolommen `tees.gender` en `tournament_tees.gender`, THE Migration_Script SHALL elke bestaande waarde `'male'` behouden als `'male'`, elke waarde `'female'` behouden als `'female'`, en elke `NULL` behouden als `NULL`, via een expliciete `USING gender::public.gender_binary` respectievelijk `USING gender::public.gender_category` cast.
2. WHEN een kolom is omgezet naar een ENUM-type, THE Migration_Script SHALL de bijbehorende `CHECK constraint` op die kolom verwijderen via `ALTER TABLE … DROP CONSTRAINT`.
3. WHEN de Migration_Script is voltooid, THE Database SHALL voor elke rij in elke gemigreerde tabel een kolomwaarde bevatten die gelijk is aan de oorspronkelijke tekstwaarde vóór de migratie (of `NULL` als de oorspronkelijke waarde `NULL` was).
4. THE Migration_Script SHALL uitvoerbaar zijn als één atomische transactie (`BEGIN … COMMIT`), zodat bij een fout de volledige migratie automatisch wordt teruggedraaid zonder partiële toestandswijzigingen.
5. IF een bestaande rij een waarde bevat die niet in de doelset van het ENUM-type past en ook niet `NULL` is, THEN THE Migration_Script SHALL de transactie afbreken met een beschrijvende foutmelding vóór enige kolomwijziging, zodat geen enkele tabel gedeeltelijk gemigreerd achterblijft.
6. WHILE de Migration_Script actief is, THE Database SHALL schrijfoperaties op tabellen die niet direct worden gewijzigd door een `ALTER TABLE` statement in dit script niet blokkeren of afwijzen.

---

### Requirement 4: Migratie van alle betrokken kolommen

**User Story:** Als ontwikkelaar, wil ik dat alle twaalf geconstrained TEXT-kolommen worden gemigreerd naar hun corresponderende ENUM-type, zodat het schema volledig en consistent is.

#### Acceptance Criteria

1. THE Migration_Script SHALL `tournaments.format` omzetten van `TEXT` naar `public.tournament_format` via `ALTER TABLE tournaments ALTER COLUMN format TYPE public.tournament_format USING format::public.tournament_format`.
2. THE Migration_Script SHALL `tournaments.scoring_type` omzetten van `TEXT` naar `public.scoring_type` via `USING scoring_type::public.scoring_type`.
3. THE Migration_Script SHALL `tournaments.status` omzetten van `TEXT` naar `public.tournament_status` via `USING status::public.tournament_status`.
4. THE Migration_Script SHALL `tournament_players.status` omzetten van `TEXT` naar `public.player_status` via `USING status::public.player_status`.
5. THE Migration_Script SHALL `tees.gender` omzetten van `TEXT` naar `public.gender_binary` via `USING gender::public.gender_binary`.
6. THE Migration_Script SHALL `tournament_players.gender` omzetten van `TEXT` naar `public.gender_binary` via `USING gender::public.gender_binary`.
7. THE Migration_Script SHALL `tournament_categories.gender` omzetten van `TEXT` naar `public.gender_category` via `USING gender::public.gender_category`.
8. THE Migration_Script SHALL `tournament_tees.gender` omzetten van `TEXT` naar `public.gender_category` via `USING gender::public.gender_category`.
9. THE Migration_Script SHALL `loops.loop_type` omzetten van `TEXT` naar `public.loop_type` via `USING loop_type::public.loop_type`.
10. THE Migration_Script SHALL `profiles.role` omzetten van `TEXT` naar `public.user_role` via `USING role::public.user_role`.
11. THE Migration_Script SHALL `courses.source` omzetten van `TEXT` naar `public.course_source` via `USING source::public.course_source`.
12. THE Migration_Script SHALL `profiles.language` omzetten van `TEXT` naar `public.language` via `USING language::public.language`.
13. THE Migration_Script SHALL alle ENUM-type-aanmakingen (Requirement 1) voltooien vóór de eerste `ALTER TABLE … ALTER COLUMN` wordt uitgevoerd.
14. IF een bestaande rij in een te migreren kolom een waarde bevat die niet overeenkomt met een waarde in het doeltype én niet `NULL` is, THEN THE Migration_Script SHALL de migratie afbreken vóór de kolom wordt aangepast.

---

### Requirement 5: Verwijdering van redundante CHECK constraints

**User Story:** Als database-administrator, wil ik dat de oorspronkelijke CHECK constraints worden verwijderd na de ENUM-migratie, zodat er geen dubbele domeincontroles bestaan.

#### Acceptance Criteria

1. WHEN een kolom is omgezet naar een ENUM-type, THE Migration_Script SHALL de bijbehorende `CHECK constraint` verwijderen via `ALTER TABLE … DROP CONSTRAINT IF EXISTS <constraint_name>`, waarbij `<constraint_name>` de naam is van de constraint waarvan het predikaat uitsluitend de gemigreerde kolom betreft.
2. IF de Migration_Script is uitgevoerd zonder fouten, THEN THE Database SHALL geen `CHECK constraint` bevatten waarvan het predikaat één van de twaalf gemigreerde kolommen betreft.
3. THE Migration_Script SHALL uitsluitend CHECK constraints verwijderen waarvan het predikaat verwijst naar een kolom die in dezelfde migratie wordt omgezet; constraints op andere kolommen worden ongemoeid gelaten.
4. THE Migration_Script SHALL idempotent zijn voor de constraint-verwijdering: heruitvoering wanneer de constraints al verwijderd zijn SHALL geen fout veroorzaken (`DROP CONSTRAINT IF EXISTS`).
5. IF de kolomconversie van een kolom mislukt, THEN THE Migration_Script SHALL de bijbehorende CHECK constraint NIET verwijderen voor die kolom, doordat de migratie als één atomische transactie wordt uitgevoerd.

---

### Requirement 6: Synchronisatie van TypeScript-types

**User Story:** Als ontwikkelaar, wil ik dat `database.types.ts` en `packages/types/src/index.ts` worden bijgewerkt nadat de databasemigratie is uitgevoerd, zodat de TypeScript-types exact overeenkomen met de PostgreSQL ENUM-definities.

#### Acceptance Criteria

1. WHEN de databasemigratie is uitgevoerd en `supabase gen types typescript` is aangeroepen, THE Type_Sync SHALL `database.types.ts` genereren met de ENUM-waarden van elke gemigreerde kolom als string-literal union-type, waarbij `public.gender_binary` en `public.gender_category` als twee aparte union-types verschijnen.
2. THE Shared_Types (`packages/types/src/index.ts`) SHALL union-types bevatten die exact overeenkomen met de waarden van de corresponderende PostgreSQL ENUM-types na de migratie, inclusief dezelfde spellingvorm en volgorde.
3. THE Shared_Types SHALL het bestaande `Gender = 'male' | 'female' | 'mixed'` type vervangen door twee aparte types: `GenderBinary = 'male' | 'female'` (voor `tees.gender` en `tournament_players.gender`) en `GenderCategory = 'male' | 'female' | 'mixed'` (voor `tournament_categories.gender` en `tournament_tees.gender`).
4. THE Shared_Types SHALL de `Tee`- en `TournamentTee`-interfaces bijwerken zodat het `gender`-veld het type `GenderBinary | null` respectievelijk `GenderCategory | null` heeft.
5. THE Shared_Types SHALL het `gender`-veld van de `TournamentPlayer`-interface het type `GenderBinary | null` geven (was: `Gender | null`), zodat het type niet breder is dan het databaseschema toestaat.
6. WHEN een ENUM-type in de database een waarde krijgt toegevoegd via `ALTER TYPE … ADD VALUE`, THE ontwikkelaar SHALL `supabase gen types typescript` opnieuw uitvoeren en `packages/types/src/index.ts` handmatig bijwerken om de nieuwe waarde op te nemen.

---

### Requirement 7: Toekomstige uitbreidbaarheid van ENUM-waarden

**User Story:** Als ontwikkelaar, wil ik weten hoe ENUM-waarden in de toekomst veilig kunnen worden uitgebreid, zodat ik bij nieuwe vereisten het schema correct kan aanpassen zonder data-verlies.

#### Acceptance Criteria

1. THE Migration_Script SHALL een commentaarsectie bevatten met de titel "Uitbreidbaarheid" die minimaal het volgende documenteert: (a) de exacte SQL-syntax voor het toevoegen van een waarde (`ALTER TYPE <type_name> ADD VALUE '<nieuwe_waarde>'`), en (b) een concreet voorbeeld voor tenminste één van de aangemaakte ENUM-types.
2. THE Migration_Script SHALL in dezelfde commentaarsectie documenteren dat het verwijderen of hernoemen van een ENUM-waarde de volgende drie stappen vereist: (1) een nieuw ENUM-type aanmaken met de gewenste waarden, (2) de kolom converteren via `ALTER TABLE … ALTER COLUMN … TYPE … USING`, en (3) het oude ENUM-type verwijderen via `DROP TYPE`.
3. WHEN een ENUM-waarde wordt toegevoegd aan een bestaand ENUM-type via `ALTER TYPE … ADD VALUE`, THE Database SHALL alle bestaande rijen in alle tabellen die dat ENUM-type gebruiken ongewijzigd laten, zonder triggers op de betrokken kolom te activeren en zonder cascading updates uit te voeren.
4. IF een applicatie een INSERT of UPDATE uitvoert op een ENUM-kolom met een waarde die niet tot het ENUM-type behoort, THEN THE Database SHALL de operatie afwijzen met een PostgreSQL-foutmelding die aangeeft dat de waarde ongeldig is voor het specifieke ENUM-type (foutcode `22P02` of equivalent).
