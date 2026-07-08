# Design Document: postgres-enum-migration

## Overview

Deze feature vervangt alle `TEXT + CHECK constraint`-kolommen in de OpenTour PostgreSQL-database door native PostgreSQL ENUM-types, lost een gender-inconsistentie op, en synchroniseert de TypeScript-types in `packages/supabase/src/database.types.ts` en `packages/types/src/index.ts`.

De wijziging bestaat uit drie delen die in vaste volgorde worden uitgevoerd:

1. **SQL-migratiescript** — één atomische transactie die ENUMs aanmaakt, kolommen converteert, CHECK-constraints verwijdert en de snapshot-trigger bijwerkt.
2. **Type regeneratie** — `supabase gen types typescript` opnieuw uitvoeren na de migratie.
3. **Handmatige TypeScript-update** — `packages/types/src/index.ts` bijwerken om de split van `Gender` in `GenderBinary` / `GenderCategory` door te voeren.

---

## Architecture

De oplossing is volledig in de bestaande Supabase + Turborepo-architectuur ingebed. Er zijn geen nieuwe services of packages nodig.

```
supabase/migrations/
  └── 20260708140000_enum_migration.sql   ← nieuw: atomische ENUM-migratie

packages/supabase/src/
  └── database.types.ts                   ← hergenereren via supabase gen types

packages/types/src/
  └── index.ts                            ← handmatig: Gender-split + Tee/TournamentTee/TournamentPlayer
```

### Uitvoeringsvolgorde

```
1. supabase db push
   → voert 20260708140000_enum_migration.sql uit als atomische transactie

2. supabase gen types typescript --project-id <id>
   → overschrijft packages/supabase/src/database.types.ts

3. Handmatig bijwerken van packages/types/src/index.ts
   → Gender-split, Tee.gender, TournamentTee.gender, interface-updates

4. pnpm build
   → TypeScript-compilatie als validatie
```

### Betrokken bestanden

| Bestand | Type wijziging |
|---|---|
| `supabase/migrations/20260708140000_enum_migration.sql` | Nieuw — bevat de volledige migratie |
| `packages/supabase/src/database.types.ts` | Hergenereren via `supabase gen types typescript` |
| `packages/types/src/index.ts` | Handmatig bijwerken |

---

## Components and Interfaces

### Migratiescript — structuur en volgorde

Het script wordt volledig in één `BEGIN … COMMIT`-blok uitgevoerd. Elke stap mislukt de gehele transactie als er een fout optreedt.

#### Structuur

```
BEGIN;
  Stap 1: CREATE TYPE (10 ENUM-types, met duplicate_object guard)
  Stap 2: Pre-flight validatie (ongeldige waarden detecteren vóór conversie)
  Stap 3: ALTER COLUMN TYPE (12 kolommen)
  Stap 4: DROP CONSTRAINT IF EXISTS (11 CHECK-constraints)
  Stap 5: Trigger-update (freeze_tournament_course_snapshot)
  Stap 6: Uitbreidbaarheids-commentaar
COMMIT;
```

#### Stap 1: ENUM-types aanmaken

`CREATE TYPE … IF NOT EXISTS` bestaat niet in PostgreSQL 15. In plaats daarvan wordt de exception-guard gebruikt:

```sql
DO $$ BEGIN
  CREATE TYPE public.tournament_format AS ENUM ('strokeplay', 'stableford', 'matchplay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Dezelfde aanpak voor alle tien types: `tournament_format`, `scoring_type`, `tournament_status`, `player_status`, `gender_binary`, `gender_category`, `loop_type`, `user_role`, `course_source`, `language`.

#### Stap 2: Pre-flight validatie

Vóór enige `ALTER COLUMN` worden alle kolommen gecontroleerd op ongeldige waarden. Bij een treffer wordt de transactie afgebroken met tabelnaam, rij-id en ongeldige waarde:

```sql
DO $$
DECLARE v_count INT; v_detail TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM tees
  WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');
  IF v_count > 0 THEN
    SELECT string_agg('id=' || id || ' gender=' || gender, ', ') INTO v_detail
    FROM tees WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');
    RAISE EXCEPTION 'Ongeldige waarden in tees.gender: %', v_detail;
  END IF;
  -- Idem voor alle andere 11 kolommen ...
END $$;
```

#### Stap 3: ALTER COLUMN TYPE

```sql
ALTER TABLE profiles           ALTER COLUMN language     TYPE public.language           USING language::public.language;
ALTER TABLE profiles           ALTER COLUMN role          TYPE public.user_role          USING role::public.user_role;
ALTER TABLE courses            ALTER COLUMN source        TYPE public.course_source      USING source::public.course_source;
ALTER TABLE tournaments        ALTER COLUMN format        TYPE public.tournament_format  USING format::public.tournament_format;
ALTER TABLE tournaments        ALTER COLUMN scoring_type  TYPE public.scoring_type       USING scoring_type::public.scoring_type;
ALTER TABLE tournaments        ALTER COLUMN status        TYPE public.tournament_status  USING status::public.tournament_status;
ALTER TABLE tournament_players ALTER COLUMN status        TYPE public.player_status      USING status::public.player_status;
ALTER TABLE tournament_players ALTER COLUMN gender        TYPE public.gender_binary      USING gender::public.gender_binary;
ALTER TABLE tournament_categories ALTER COLUMN gender     TYPE public.gender_category    USING gender::public.gender_category;
ALTER TABLE tournament_tees    ALTER COLUMN gender        TYPE public.gender_category    USING gender::public.gender_category;
ALTER TABLE tees               ALTER COLUMN gender        TYPE public.gender_binary      USING gender::public.gender_binary;
ALTER TABLE loops              ALTER COLUMN loop_type     TYPE public.loop_type          USING loop_type::public.loop_type;
```

#### Stap 4: DROP CONSTRAINT

PostgreSQL genereert automatische constraint-namen voor inline CHECK-constraints op basis van het patroon `<tabel>_<kolom>_check`.

| Tabel | Kolom | Constraint naam |
|---|---|---|
| `profiles` | `language` | `profiles_language_check` |
| `profiles` | `role` | `profiles_role_check` |
| `courses` | `source` | `courses_source_check` |
| `tournaments` | `format` | `tournaments_format_check` |
| `tournaments` | `scoring_type` | `tournaments_scoring_type_check` |
| `tournaments` | `status` | `tournaments_status_check` |
| `tournament_players` | `status` | `tournament_players_status_check` |
| `tournament_players` | `gender` | geen (kolom zonder CHECK toegevoegd) |
| `tournament_categories` | `gender` | `tournament_categories_gender_check` |
| `tournament_tees` | `gender` | `tournament_tees_gender_check` |
| `tees` | `gender` | `tees_gender_check` |
| `loops` | `loop_type` | `loops_loop_type_check` |

```sql
ALTER TABLE profiles              DROP CONSTRAINT IF EXISTS profiles_language_check;
ALTER TABLE profiles              DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE courses               DROP CONSTRAINT IF EXISTS courses_source_check;
ALTER TABLE tournaments           DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments           DROP CONSTRAINT IF EXISTS tournaments_scoring_type_check;
ALTER TABLE tournaments           DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE tournament_players    DROP CONSTRAINT IF EXISTS tournament_players_status_check;
ALTER TABLE tournament_categories DROP CONSTRAINT IF EXISTS tournament_categories_gender_check;
ALTER TABLE tournament_tees       DROP CONSTRAINT IF EXISTS tournament_tees_gender_check;
ALTER TABLE tees                  DROP CONSTRAINT IF EXISTS tees_gender_check;
ALTER TABLE loops                 DROP CONSTRAINT IF EXISTS loops_loop_type_check;
```

`tournament_players.gender` heeft geen CHECK-constraint en heeft geen DROP nodig.

#### Stap 5: Trigger-update

De `freeze_tournament_course_snapshot`-functie kopieert bij `draft → active` de tees naar `tournament_tees`, maar kopieert het `gender`-veld nog niet. Na de migratie is `tees.gender` van type `public.gender_binary` en `tournament_tees.gender` van type `public.gender_category`. Een directe ENUM-naar-ENUM cast bestaat niet in PostgreSQL; de omweg via `text` is nodig.

```sql
CREATE OR REPLACE FUNCTION freeze_tournament_course_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournament_holes WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_holes (tournament_id, source_hole_id, number, par, stroke_index, distance_meters)
    SELECT NEW.id, h.id, h.number, h.par, h.stroke_index, h.distance_meters
    FROM holes h WHERE h.course_id = NEW.course_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tournament_tees WHERE tournament_id = NEW.id) THEN
    INSERT INTO tournament_tees (tournament_id, source_tee_id, name, color, slope_rating, course_rating, gender)
    SELECT NEW.id, te.id, te.name, te.color, te.slope_rating, te.course_rating,
           te.gender::text::public.gender_category
    FROM tees te WHERE te.course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

### Functie `assign_player_category`

De functie `assign_player_category(p_player_id UUID, p_handicap FLOAT, p_gender TEXT)` vergelijkt `p_gender` met `tournament_categories.gender` (na migratie: `public.gender_category`). PostgreSQL cast een `TEXT`-parameter impliciet naar een ENUM via de ingebouwde impliciete cast. De functiesignatuur hoeft **niet** gewijzigd te worden.

---

## Data Models

### ENUM-types en hun kolommen

| ENUM-type | Waarden | Gebruikt door |
|---|---|---|
| `public.tournament_format` | `strokeplay`, `stableford`, `matchplay` | `tournaments.format` |
| `public.scoring_type` | `gross`, `net` | `tournaments.scoring_type` |
| `public.tournament_status` | `draft`, `active`, `paused`, `finished` | `tournaments.status` |
| `public.player_status` | `registered`, `confirmed`, `withdrawn`, `dns`, `dnf`, `dsq` | `tournament_players.status` |
| `public.gender_binary` | `male`, `female` | `tees.gender`, `tournament_players.gender` |
| `public.gender_category` | `male`, `female`, `mixed` | `tournament_categories.gender`, `tournament_tees.gender` |
| `public.loop_type` | `full_18`, `front_9`, `back_9`, `custom` | `loops.loop_type` |
| `public.user_role` | `organizer`, `recorder` | `profiles.role` |
| `public.course_source` | `egolf4u`, `custom`, `community` | `courses.source` |
| `public.language` | `nl`, `en` | `profiles.language` |

### TypeScript-wijzigingen in packages/types/src/index.ts

#### ENUM-types — Gender-split

```typescript
// Verwijder:
export type Gender = 'male' | 'female' | 'mixed';

// Voeg toe:
export type GenderBinary   = 'male' | 'female';
export type GenderCategory = 'male' | 'female' | 'mixed';
```

#### Tee interface — gender toevoegen

```typescript
export interface Tee {
  id: string;
  course_id: string;
  external_id: string;
  name?: string;
  color?: string;
  slope_rating?: number;
  course_rating?: number;
  gender: GenderBinary | null;  // nieuw veld
  created_at: string;
}
```

#### TournamentTee interface — gender toevoegen

```typescript
export interface TournamentTee {
  id: string;
  tournament_id: string;
  source_tee_id?: string;
  name?: string;
  color?: string;
  slope_rating?: number;
  course_rating?: number;
  gender: GenderCategory | null;  // nieuw veld
  created_at: string;
}
```

#### TournamentCategory interface

```typescript
export interface TournamentCategory {
  // ...
  gender?: GenderCategory;  // was: Gender
  // ...
}
```

#### TournamentPlayer interface

```typescript
export interface TournamentPlayer {
  // ...
  gender?: GenderBinary;  // was: Gender
  // ...
}
```

---

## Correctness Properties

De volgende eigenschappen worden getest om dataveiligheid en correctheid te garanderen:

### Property 1: Roundtrip-eigenschap

Voor elke geldige tekstwaarde in de originele CHECK-set is de ENUM-cast `value::public.<type>` succesvol en retourneert de waarde ongewijzigd. Genereer alle mogelijke geldige tekstwaarden per ENUM-type en verifieer dat een roundtrip (INSERT als tekst → SELECT als ENUM → vergelijk) de originele waarde teruggeeft.

**Validates: Requirements 3.1, 3.3**

### Property 2: NULL-behoud

Een NULL-waarde in een TEXT-kolom blijft NULL na `USING value::public.<type>`. Een rij met een NULL-waarde in een gemigreerde kolom moet na de migratie nog steeds NULL bevatten.

**Validates: Requirements 2.3, 3.1**

### Property 3: Afwijzing van ongeldige waarden

Een INSERT of UPDATE op een ENUM-kolom met een waarde buiten de ENUM-set geeft PostgreSQL-foutcode `22P02`. Genereer ongeldige waarden (bijv. `'mixed'` op `gender_binary`, `'other'` op elk type) en verifieer dat de database de operatie afwijst.

**Validates: Requirements 7.4**

### Property 4: Atomiciteit bij validatiefout

Als de pre-flight validatie een ongeldige waarde vindt, bevat geen enkele tabel een gedeeltelijk gemigreerde toestand. Simuleer een ongeldige rij in één tabel en verifieer dat na de mislukte transactie alle kolommen nog steeds van het type TEXT zijn.

**Validates: Requirements 3.4, 3.5, 2.4**

### Property 5: Idempotentie

Het uitvoeren van het migratiescript twee keer geeft geen fout. De ENUM-guard (`EXCEPTION WHEN duplicate_object`) en `DROP CONSTRAINT IF EXISTS` zorgen ervoor dat heruitvoering veilig is.

**Validates: Requirements 1.1, 5.4**

### Property 6: Trigger-correctheid

Bij de statusovergang `draft → active` wordt `tees.gender` correct gekopieerd naar `tournament_tees.gender` als `gender_category`. Verifieer dat de waarden `'male'` en `'female'` correct worden overgenomen en dat NULL als NULL bewaard blijft.

**Validates: Requirements 2.5**

---

## Error Handling

| Situatie | Gedrag |
|---|---|
| Rij met ongeldige waarde voor gender_binary | Pre-flight validatie breekt transactie af met tabelnaam + rij-id + waarde |
| Rij met ongeldige waarde voor andere ENUM | Pre-flight validatie breekt transactie af; USING-cast geeft anders foutcode 22P02 |
| CHECK-constraint naam wijkt af van verwachting | `DROP CONSTRAINT IF EXISTS` gooit geen fout; constraint blijft dan staan — handmatig controleren via `pg_constraint` |
| Script twee keer uitvoeren | Geen fout: ENUM-guard vangt `duplicate_object`, `DROP … IF EXISTS` is no-op |
| TypeScript-compilatie na type-split | `pnpm build` toont alle plaatsen waar `Gender` direct gebruikt wordt in plaats van `GenderBinary`/`GenderCategory` |

---

## Testing Strategy

### Vóór uitvoering op productie

1. Dry-run met `BEGIN; … ROLLBACK;` op een kopie van de productiedatabase.
2. Controleer via `pg_constraint` of alle te verwijderen constraint-namen kloppen.
3. Voer de pre-flight validatie geïsoleerd uit (buiten de transactie) om eventuele ongeldige rijen te identificeren.

### Na uitvoering

1. Controleer kolomtypes via `information_schema.columns` — alle 12 kolommen moeten `USER-DEFINED` als `data_type` tonen.
2. Controleer via `pg_enum` dat alle ENUM-types de juiste waarden bevatten.
3. Voer `pnpm build` uit om TypeScript-compilatie te valideren.
4. Controleer de gegenereerde `database.types.ts` op aanwezigheid van de `Enums`-sectie.

### Property-based tests

In de test-suite worden de volgende eigenschappen gevalideerd met representatieve inputs:

```typescript
// Voorbeeld: roundtrip voor gender_binary
for (const value of ['male', 'female', null]) {
  // INSERT met TEXT-waarde, SELECT terug als ENUM → zelfde waarde
}

// Ongeldige waarden worden afgewezen
for (const invalid of ['mixed', 'other', '']) {
  // INSERT op gender_binary kolom → verwacht foutcode 22P02
}
```
