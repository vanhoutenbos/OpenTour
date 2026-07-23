# OpenTour API Documentatie

## Inleiding
Deze API is gebouwd met **Supabase** en biedt toegang tot de database via Row-Level Security (RLS). De frontend communiceert direct met de database via de Supabase-client.

---

## Authenticatie
### 1. Supabase Auth
- **Endpoint**: `https://<project-ref>.supabase.co/auth/v1`
- **Methoden**:
  - `signUp`: Registreren met e-mail/wachtwoord.
  - `signIn`: Inloggen met e-mail/wachtwoord.
  - `signOut`: Uitloggen.
- **Rollen**:
  - `organizer`: Kan toernooien aanmaken en beheren.
  - `recorder`: Kan scores invoeren en bewerken.

### 2. Access Codes
Tijdelijke inlogcodes voor recorders zonder account:
- **Tabel**: `access_codes`
- **Velden**:
  - `code`: 8-tekens code (uniek).
  - `tournament_id`: Toernooi waarvoor de code geldig is.
  - `expires_at`: Vervaldatum (standaard 24 uur).
  - `is_active`: Actief of niet.

---

## Database Schema
### Tabellen
#### 1. `profiles`
Gebruikersprofielen (uitbreiding op Supabase Auth).

| Veld          | Type      | Beschrijving                                  |
|---------------|-----------|----------------------------------------------|
| `id`          | UUID      | Primaire sleutel (koppeling met `auth.users`). |
| `display_name`| TEXT      | Weergavenaam van de gebruiker.                |
| `email`       | TEXT      | E-mailadres.                                  |
| `handicap`    | FLOAT     | Handicap van de speler.                       |
| `language`    | TEXT      | Taalvoorkeur (`nl` of `en`).                  |
| `role`        | TEXT      | Rol (`organizer` of `recorder`).              |

#### 2. `courses`
Golfbanen.

| Veld           | Type      | Beschrijving                                  |
|----------------|-----------|----------------------------------------------|
| `id`           | UUID      | Primaire sleutel.                             |
| `name`         | TEXT      | Naam van de baan.                            |
| `location`     | TEXT      | Locatie.                                     |
| `country`      | TEXT      | Land (standaard `NL`).                        |
| `holes_count`  | INT       | Aantal holes (standaard 18).                  |
| `source`       | TEXT      | Bron (`egolf4u`, `custom`, `community`).      |
| `external_id`  | TEXT      | Extern ID (bijv. eGolf4u ID).                 |
| `created_by`   | UUID      | Maker van de baan (koppeling met `auth.users`).|

#### 3. `tournaments`
Toernooien.

| Veld           | Type      | Beschrijving                                  |
|----------------|-----------|----------------------------------------------|
| `id`           | UUID      | Primaire sleutel.                             |
| `name`         | TEXT      | Naam van het toernooi.                       |
| `description`  | TEXT      | Beschrijving.                                 |
| `course_id`    | UUID      | Golfbaan (koppeling met `courses`).           |
| `format`       | TEXT      | Formaat (`stroke`, `stableford`, `match`).    |
| `scoring_type` | TEXT      | Scoring (`gross` of `net`).                   |
| `rounds`       | INT       | Aantal rondes (standaard 1).                  |
| `status`       | TEXT      | Status (`draft`, `active`, `paused`, `finished`).|
| `is_public`    | BOOLEAN   | Publiekelijk zichtbaar of niet.              |
| `start_date`   | TIMESTAMP | Startdatum.                                   |
| `end_date`     | TIMESTAMP | Einddatum.                                    |
| `created_by`   | UUID      | Maker (koppeling met `auth.users`).           |

#### 4. `flights`
Startgroepen binnen een toernooi.

| Veld           | Type      | Beschrijving                                  |
|----------------|-----------|----------------------------------------------|
| `id`           | UUID      | Primaire sleutel.                             |
| `tournament_id`| UUID      | Toernooi (koppeling met `tournaments`).       |
| `name`         | TEXT      | Naam van de flight.                           |
| `start_time`   | TIMESTAMP | Starttijd.                                    |
| `tee_number`   | INT       | Tee-nummer (standaard 1).                     |

#### 5. `tournament_players`
Deelnemers aan een toernooi.

| Veld           | Type      | Beschrijving                                  |
|----------------|-----------|----------------------------------------------|
| `id`           | UUID      | Primaire sleutel.                             |
| `tournament_id`| UUID      | Toernooi (koppeling met `tournaments`).       |
| `flight_id`    | UUID      | Flight (koppeling met `flights`).             |
| `profile_id`   | UUID      | Gebruiker (koppeling met `profiles`).          |
| `name`         | TEXT      | Naam van de speler.                           |
| `email`        | TEXT      | E-mailadres.                                  |
| `handicap`     | FLOAT     | Handicap.                                     |
| `status`       | TEXT      | Status (`registered`, `confirmed`, `withdrawn`, `dns`, `dnf`, `dsq`).|

#### 6. `scores`
Scores per hole/ronde.

| Veld           | Type      | Beschrijving                                  |
|----------------|-----------|----------------------------------------------|
| `id`           | UUID      | Primaire sleutel.                             |
| `tournament_id`| UUID      | Toernooi (koppeling met `tournaments`).       |
| `player_id`    | UUID      | Speler (koppeling met `tournament_players`).  |
| `hole_id`      | UUID      | Hole (koppeling met `holes`).                 |
| `round_number` | INT       | Rondenummer (standaard 1).                    |
| `strokes`      | INT       | Aantal slagen.                                |
| `recorded_by`  | UUID      | Opgenomen door (koppeling met `auth.users`).   |
| `is_verified`  | BOOLEAN   | Geverifieerd of niet.                         |

---

## Functies
### 1. `upsert_score_if_newer`
Voegt een score in of werkt deze bij als de nieuwe score recenter is.

```sql
CREATE OR REPLACE FUNCTION upsert_score_if_newer(
  p_tournament_id UUID,
  p_player_id UUID,
  p_hole_id UUID,
  p_round_number INT,
  p_strokes INT,
  p_recorded_by UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO scores (tournament_id, player_id, hole_id, round_number, strokes, recorded_by)
  VALUES (p_tournament_id, p_player_id, p_hole_id, p_round_number, p_strokes, p_recorded_by)
  ON CONFLICT (tournament_id, player_id, hole_id, round_number)
  DO UPDATE SET
    strokes = EXCLUDED.strokes,
    recorded_by = EXCLUDED.recorded_by,
    is_verified = false,
    updated_at = now()
  WHERE EXCLUDED.updated_at > scores.updated_at;
END;
$$ LANGUAGE plpgsql;
```

---

## Row-Level Security (RLS)
### Voorbeeld: `tournaments` tabel
```sql
-- Organisatoren kunnen hun eigen toernooien beheren
CREATE POLICY "Organizers manage their tournaments"
ON tournaments
FOR ALL
USING (created_by = auth.uid());

-- Recorders kunnen scores invoeren voor actieve toernooien
CREATE POLICY "Recorders can view active tournaments"
ON tournaments
FOR SELECT
USING (status = 'active' AND is_public = true);
```

---

## Aanbevolen Queries
### 1. Ophalen van een toernooi met deelnemers en scores
```sql
SELECT
  t.id, t.name, t.status,
  json_agg(
    json_build_object(
      'player', tp.name,
      'scores', (
        SELECT json_agg(
          json_build_object('hole', h.number, 'strokes', s.strokes)
        )
        FROM scores s
        JOIN holes h ON s.hole_id = h.id
        WHERE s.player_id = tp.id
      )
    )
  ) AS participants
FROM tournaments t
JOIN tournament_players tp ON t.id = tp.tournament_id
WHERE t.id = 'TOERNOOI_ID'
GROUP BY t.id;
```

---

## Contact
Voor vragen: [support@opentour.golf](mailto:support@opentour.golf)