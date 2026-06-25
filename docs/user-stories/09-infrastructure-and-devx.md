# Epic 09 — Infrastructuur en developer experience

## Epic beschrijving

Infrastructurele verbeteringen en developer experience: CI/CD, dependency hygiene, omgevingsvariabelen, documentatie en PWA-configuratie. Deze stories zijn niet direct zichtbaar voor eindgebruikers maar essentieel voor een robuuste, onderhoudbare codebase.

---

## User stories

### US-INFRA-01 — CI/CD pipeline uitbreiden

- **Rol:** Ontwikkelaar
- **Doel:** Dat de CI/CD pipeline naast lint en typecheck ook unit tests, E2E tests en turbo caching gebruikt
- **Waarde:** Ik krijg snellere en completere feedback; cache versnelt runs
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** —
- **Huidige situatie:**
  - `.github/workflows/pr.yml` draait al: lint, typecheck en build op PRs naar main
  - `.github/workflows/release.yml` draait Supabase migraties op push naar main (worker deploy uitgeschreven)
  - `.github/dependabot.yml` bestaat maar heeft lege `package-ecosystem` — werkt niet
- **Acceptatiecriteria:**
  - `pr.yml` gebruikt `turbo` voor taakorkestratie (nu per-workspace scripts)
  - Cache voor node_modules, `.turbo/cache`, en `.next/cache`
  - Playwright E2E tests draaien na build, met artifact upload bij failure
  - Unit tests (vitest) draaien in de pipeline
  - Supabase `gen-types` stap draait alleen bij PRs die `packages/supabase/` raken
  - Secrets: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - Workflow duurt niet langer dan ~10 minuten (inclusief cache hits)
- **Opmerkingen:**
  - Vervang per-workspace `working-directory: apps/web` door `turbo run lint typecheck build test`
  - Overweeg aparte workflows: `ci.yml` en `e2e.yml` (alleen bij PRs of manual dispatch)
  - Dependabot repareren: `package-ecosystem: "npm"` instellen

---

### US-INFRA-02 — CSP dynamisch maken (Supabase URL uit env)

- **Status: ✅ Opgelost** zie commit
- Hardcoded Supabase URL in `next.config.js` CSP `connect-src` vervangen door `process.env.NEXT_PUBLIC_SUPABASE_URL` met fallback

---

### US-INFRA-03 — packages/i18n/index.ts entry point ontbreekt

- **Status: ✅ Opgelost** zie commit
- `packages/i18n/index.ts` aangemaakt met `getMessages()` functie die alle namespaces per taal exporteert

---

### US-INFRA-04 — Ontwikkelaarsdocumentatie aanvullen

- **Rol:** Ontwikkelaar (nieuw of bestaand teamlid)
- **Doel:** Dat ik in de README en/of SETUP.md kan vinden welke omgevingsvariabelen nodig zijn (uitgesplitst naar client vs server), hoe ik lokaal kan ontwikkelen, en hoe ik Supabase types genereer
- **Waarde:** Ik kan sneller onboarden en hoef niet de code te lezen om te weten welke envs ik moet instellen
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** —
- **Acceptatiecriteria:**
  - README bevat: projectbeschrijving, architectuuroverzicht (monorepo workspaces), link naar docs/
  - SETUP.md bevat:
    - Vereiste env vars in tabel-vorm: variabele, client/server, verplicht/optioneel, omschrijving
    - Lokale Supabase setup (supabase start / migrate / seed)
    - Hoe Supabase types te genereren (`supabase gen types` via het gen-types script)
    - Hoe de Cloudflare Worker lokaal te draaien (wrangler dev)
    - Veelvoorkomende foutmeldingen en oplossingen
  - Voorbeeld `.env.example` bestanden in apps/web/, workers/api/, packages/supabase/ (indien van toepassing)
- **Opmerkingen:**
  - `.env.example` kan gebruikt worden om de structuur te tonen zonder secrets weg te geven
  - Voeg een korte beschrijving van het offline-first architectuurpatroon (Dexie.js sync queue)

---

### US-INFRA-05 — PWA / next-pwa configuratie verifiëren voor Next 14

- **Rol:** Scorer (eindgebruiker)
- **Doel:** Dat de PWA (service worker) correct werkt op Next.js 14 en de scorer-pagina offline beschikbaar is
- **Waarde:** Scorers kunnen scores blijven invoeren ook als de internetverbinding tijdelijk wegvalt
- **Prioriteit:** M
- **Fase:** MVP
- **Afhankelijk van:** VS-06 (offline-first architectuur)
- **Acceptatiecriteria:**
  - Service worker wordt correct geregistreerd bij bezoek aan `/scorer`
  - next-pwa disable in dev-modus werkt (geen SW in dev, wel in productie)
  - Runtime caching rules zijn geconfigureerd voor API calls en statische assets
  - Service worker overschrijft Supabase auth sessie niet (cookie vs localStorage gedrag)
  - Test: PWA-installatie flow werkt (manifest, iconen, start_url)
  - Test: na eenmalig laden werkt de scorer offline (Dexie-based, geen fetch errors door ontbrekende SW fetch handler)
- **Opmerkingen:**
  - next-pwa v5.6.0 is mogelijk breaking met Next 14; controleer de github issues van next-pwa
  - Overweeg migratie naar `@serwist/next` als next-pwa onvoldoende werkt (zie https://serwist.pages.dev)
  - Service worker outputs in `public/sw.js` en `public/workbox-*.js` — committen of gitignore?
  - Huidige sw.js is gegenereerd; bij wijzigingen in de config opnieuw builden

---

### US-INFRA-06 — `@vitejs/plugin-react` verwijderd uit apps/web

- **Status: ✅ Opgelost** zie commit
- Deze dependency is inmiddels verwijderd uit `apps/web/package.json` — Vite plugins zijn niet relevant voor Next.js

---

### US-INFRA-07 — `packages/supabase/src/index.ts` lazy factories + env scheiding

- **Status: ✅ Opgelost** zie commit
- Module-level throws vervangen door `getBrowserClient()` lazy factory; `createServerClient()` gebruikt nu `SUPABASE_URL` of `NEXT_PUBLIC_SUPABASE_URL`

---

### US-INFRA-08 — `apps/web/lib/supabase-server.ts` anon key fallback verwijderd

- **Status: ✅ Opgelost** zie commit
- `SUPABASE_SERVICE_ROLE_KEY` fallback naar anon key verwijderd; throwt nu als service role key ontbreekt

---

### US-INFRA-09 — CSP `unsafe-eval` en `unsafe-inline` vervangen door hashes/nonces

- **Rol:** Ontwikkelaar / security officer
- **Doel:** Dat de Content-Security-Policy geen `'unsafe-eval'` en `'unsafe-inline'` meer gebruikt voor scripts
- **Waarde:** CSP beschermt beter tegen XSS-aanvallen als inline scripts niet zomaar worden uitgevoerd
- **Prioriteit:** L
- **Fase:** Later
- **Afhankelijk van:** —
- **Huidige situatie:**
  - `next.config.js` CSP heeft: `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
  - `'unsafe-inline'` is nodig voor Next.js (style injection, app data bootstrapping)
  - `'unsafe-eval'` is nodig voor Next.js development (HMR / Fast Refresh)
- **Acceptatiecriteria:**
  - Productie CSP: `'unsafe-inline'` vervangen door nonces of hashes voor inline scripts
  - Development CSP: `'unsafe-eval'` alleen in dev-modus toestaan (via `process.env.NODE_ENV`)
  - CSP rapporteert violations naar een endpoint (report-uri of report-to) óf draait in report-only modus voor de transitie
  - Test: app werkt volledig (geen CSP violations in console) na migratie
- **Opmerkingen:**
  - Next.js 14 heeft `experimental.strictNextHead` en `reactStrictMode` die nonce-ondersteuning beïnvloeden
  - Overweeg `next.config.js` CSP dynamisch te maken: strenger in productie, losser in dev
  - Gebruik `report-uri` of `report-to` om violations te monitoren voor de transitie
  - Zie https://nextjs.org/docs/app/api-reference/config/next-config-js#content-security-policy

---

### US-INFRA-10 — Dev magic link wachtwoord in omgevingsvariabele

- **Rol:** Ontwikkelaar
- **Doel:** Dat het dev magic link wachtwoord niet hardcoded in de broncode staat maar uit een omgevingsvariabele komt
- **Waarde:** Geen hardcoded credentials in source; makkelijker te wijzigen per omgeving
- **Prioriteit:** S
- **Fase:** MVP
- **Afhankelijk van:** —
- **Huidige situatie:**
  - `apps/web/app/api/dev-magic-link/route.ts` heeft `const DEV_PASSWORD = 'dev-password-opentour-2025'` hardcoded
  - Alleen actief als `NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK=true` is gezet
- **Acceptatiecriteria:**
  - `DEV_PASSWORD` wordt gelezen uit `process.env.DEV_MAGIC_LINK_PASSWORD` in plaats van hardcoded
  - Als de env niet is gezet, gebruik een duidelijke fallback: throw een fout of genereer een random wachtwoord met een waarschuwing
  - Documentatie in SETUP.md vermeldt `DEV_MAGIC_LINK_PASSWORD` als optionele env var
- **Opmerkingen:**
  - Lage prioriteit omdat deze endpoint alleen actief is met een specifieke env flag (`NEXT_PUBLIC_ENABLE_DEV_MAGIC_LINK=true`)
  - Is alleen bedoeld voor lokale ontwikkeling, niet voor productie
