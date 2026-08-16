# OpenTour — API Contract

## Base URL

```
https://open-tour-web.vercel.app
```

## Authentication

- Public endpoints: no auth required
- Organizer endpoints: Supabase JWT via `Authorization: Bearer <token>`
- Recorder endpoints: anonymous session via `recorder_session` cookie

## Endpoints

### 1. GET /api/tournaments/[tournamentId]/leaderboard

Retourneert de live leaderboard voor een toernooi.

**Parameters**
- `tournamentId` (path): UUID van het toernooi

**Response 200**
```json
[
  {
    "position": 1,
    "player_name": "Jan Jansen",
    "total_strokes": 72,
    "total_points": 36,
    "status": "finished"
  }
]
```

**Error Codes**
- `400`: Ongeldig toernooi ID
- `404`: Toernooi niet gevonden of niet publiek
- `500`: Interne fout

### 2. GET /api/tournaments/[tournamentId]/scores

Retourneert alle scores voor een toernooi.

**Parameters**
- `tournamentId` (path): UUID van het toernooi

**Response 200**
```json
[
  {
    "id": "uuid",
    "tournament_id": "uuid",
    "player_id": "uuid",
    "round_number": 1,
    "strokes": 4,
    "is_verified": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "tournament_holes": {
      "number": 1,
      "par": 4,
      "stroke_index": 1
    }
  }
]
```

**Error Codes**
- `400`: Ongeldig toernooi ID
- `404`: Toernooi niet gevonden of niet publiek
- `500`: Scores ophalen mislukt

### 3. POST /api/validate-code

Valideert een toegangscode voor recorder toegang.

**Request Body**
```json
{
  "code": "ABCDEFGH"
}
```

**Response 200**
```json
{
  "valid": true,
  "tournamentId": "uuid"
}
```

**Response 401**
```json
{
  "error": "Code ongeldig of verlopen"
}
```

**Error Codes**
- `400`: Ongeldige code — voer 8 tekens in
- `401`: Code ongeldig of verlopen / Code verlopen
- `429`: Te veel pogingen
- `500`: Validatie mislukt

## Score Submission

Scores worden niet via een REST endpoint opgeslagen, maar via de Supabase RPC functie:

```
POST /rest/v1/rpc/upsert_score_if_newer
```

**Parameters**
- `p_tournament_id`: UUID
- `p_player_id`: UUID
- `p_hole_id`: UUID
- `p_round_number`: integer
- `p_strokes`: integer
- `p_updated_at`: ISO 8601 timestamp

**Response**
```json
{
  "score_id": "uuid",
  "was_updated": false
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — invalid/expired access code |
| 403 | Forbidden — no permission |
| 404 | Not Found — tournament/resource not found |
| 422 | Unprocessable Entity — validation error |
| 429 | Too Many Requests — rate limited |
| 500 | Internal Server Error |

## Rate Limiting

- `POST /api/validate-code`: 5 requests per minute per IP
