# API Examples

## GET /api/tournaments/{tournamentId}/leaderboard

### Request
```bash
curl https://open-tour-web.vercel.app/api/tournaments/123e4567-e89b-12d3-a456-426614174000/leaderboard
```

### Response 200
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

### Response 404
```json
{
  "error": "Toernooi niet gevonden"
}
```

---

## GET /api/tournaments/{tournamentId}/scores

### Request
```bash
curl https://open-tour-web.vercel.app/api/tournaments/123e4567-e89b-12d3-a456-426614174000/scores
```

### Response 200
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "tournament_id": "123e4567-e89b-12d3-a456-426614174000",
    "player_id": "123e4567-e89b-12d3-a456-426614174002",
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

---

## POST /api/validate-code

### Request
```bash
curl -X POST https://open-tour-web.vercel.app/api/validate-code \
  -H "Content-Type: application/json" \
  -d '{"code":"ABCDEFGH"}'
```

### Response 200
```json
{
  "valid": true,
  "tournamentId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Response 401
```json
{
  "error": "Code ongeldig of verlopen"
}
```

### Response 429
```json
{
  "error": "Te veel pogingen",
  "retryAfter": 45
}
```

---

## POST /rest/v1/rpc/upsert_score_if_newer

### Request
```bash
curl -X POST https://open-tour-web.vercel.app/rest/v1/rpc/upsert_score_if_newer \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_tournament_id": "123e4567-e89b-12d3-a456-426614174000",
    "p_player_id": "123e4567-e89b-12d3-a456-426614174002",
    "p_hole_id": "123e4567-e89b-12d3-a456-426614174003",
    "p_round_number": 1,
    "p_strokes": 4,
    "p_updated_at": "2026-01-01T00:00:00Z"
  }'
```

### Response 200
```json
{
  "score_id": "123e4567-e89b-12d3-a456-426614174004",
  "was_updated": false
}
```
