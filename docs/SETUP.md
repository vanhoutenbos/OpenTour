# OpenTour — Setup gids

## Vereisten

- Node.js 20+
- npm 10+
- Supabase account (gratis tier volstaat)
- Cloudflare account (gratis tier volstaat)
- Vercel account (gratis tier)

## Stap 1: Repository klonen

```bash
git clone https://github.com/vanhoutenbos/opentour
cd opentour
npm install
```

## Stap 2: Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een nieuw project
2. Kies regio: `West EU (Ireland)` voor NL-gebruikers
3. Noteer je **Project URL** en **API keys** (Settings → API)

## Stap 3: Database migraties uitvoeren

```bash
# Supabase CLI installeren
npm install -g supabase

# Inloggen
supabase login

# Migraties uitvoeren
supabase db push --project-ref <jouw-project-ref>
```

## Stap 4: Omgevingsvariabelen instellen

Maak `apps/web/.env.local` aan (staat in .gitignore — NOOIT committen):

```bash
# Supabase — publiek veilig (ook in browser)
NEXT_PUBLIC_SUPABASE_URL=https://jouwproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase — ALLEEN server-side, nooit client-side
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare Worker URL (optioneel in development)
NEXT_PUBLIC_WORKER_URL=https://api.opentour.nl
```

## Stap 5: Lokaal starten

```bash
npm run dev
```

De app draait op `http://localhost:3000`.

## Stap 6: Golfbaan data importeren (optioneel)

Download de eGolf4u dataset en importeer Nederlandse banen:

```bash
npx tsx scripts/import-egolf4u.ts --file ./data/egolf4u-export.json
```

## Stap 7: Cloudflare Worker deployen

```bash
cd workers/api
cp wrangler.toml.example wrangler.toml  # pas aan met jouw zone

# Secrets instellen
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put ALLOWED_ORIGINS

# Deployen
wrangler deploy
```

## Stap 8: Vercel deployen

1. Importeer de repository in [vercel.com](https://vercel.com)
2. Root directory: `apps/web`
3. Stel de omgevingsvariabelen in (dezelfde als `.env.local`, zonder `SUPABASE_SERVICE_ROLE_KEY` in productie via Vercel — gebruik GitHub Secrets)
4. Deploy

## GitHub Secrets instellen (CI/CD)

Ga naar je repository → Settings → Secrets and variables → Actions:

| Secret | Waarde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token |
| `SUPABASE_DB_PASSWORD` | Database wachtwoord |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |

> ⚠️ De `SUPABASE_SERVICE_ROLE_KEY` geeft volledige databasetoegang zonder RLS. Nooit client-side gebruiken.
