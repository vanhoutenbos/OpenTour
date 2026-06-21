# OpenTour 🏌️

> Open source golf toernooi- en live scoreplatform — gratis voor kleine organisaties, betaald bij schaal.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/vanhoutenbos/opentour/actions/workflows/pr.yml/badge.svg)](https://github.com/vanhoutenbos/opentour/actions)

## Wat is OpenTour?

OpenTour stelt iedereen in staat om professioneel uitziende golfevenementen te organiseren en te volgen — van een informele vriendenwedstrijd of laddercompetitie tot een officieel clubtoernooi met honderden deelnemers en live leaderboard.

**Kernprincipes:**
- 🆓 **Echt gratis** voor kleine organisaties, vriendgroepen en laddercompetities — geen verborgen betaalmuren
- 📡 **Live leaderboard** zonder app of account — gewoon via een gedeelde link
- 📴 **Offline-first** scores invoeren — golfbanen hebben doorgaans slecht bereik
- 🌍 **Open source** (AGPL-3.0) — zelf te hosten, aanpasbaar, transparant
- 🇳🇱 **Nederlands-first** — NL én EN vanaf dag 1

## Functionaliteiten (MVP)

- ✅ Toernooi aanmaken (stroke play, stableford, matchplay)
- ✅ Spelers toevoegen (handmatig of via CSV)
- ✅ Flights en starttijden genereren
- ✅ Scores invoeren via PWA (offline-first, IndexedDB)
- ✅ Live leaderboard (polling elke 30 seconden, geen account nodig)
- ✅ Toegangscodes voor recorders (8 tekens, geen account vereist)
- ✅ Laddercompetities en informele rondes bijhouden
- ✅ DNS / DNF / DSQ spelerstatus

## Technische stack

| Laag | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Scorer app | PWA (Service Worker + IndexedDB via Dexie.js) |
| Backend | Supabase (Postgres + Auth + RLS) |
| Edge / Cache | Cloudflare Workers + Cache API |
| Hosting | Vercel (gratis tier) |
| Monorepo | Turborepo |
| Licentie | AGPL-3.0 |

## Snel starten

```bash
git clone https://github.com/vanhoutenbos/opentour
cd opentour
npm install
npm run dev
```

Zie [docs/SETUP.md](docs/SETUP.md) voor de volledige installatiegids inclusief Supabase en Cloudflare configuratie.

## Self-hosting

OpenTour is volledig zelf te hosten via Docker Compose (Supabase OSS). Zie [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md).

Minimale vereisten: 2GB RAM, 1 vCPU, 20GB schijf (~€4/maand op Hetzner CX22).

## Bijdragen

Bijdragen zijn welkom! Zie [CONTRIBUTING.md](CONTRIBUTING.md) voor richtlijnen.

- 🐛 Bugs melden via [GitHub Issues](https://github.com/vanhoutenbos/opentour/issues)
- 💡 Ideeën bespreken via [GitHub Discussions](https://github.com/vanhoutenbos/opentour/discussions)
- 🌐 Vertalingen via community bijdragen (zie `packages/i18n/`)

## Licentie

[AGPL-3.0](LICENSE) — vrij te gebruiken en zelf te hosten. Aanpassingen die als webservice worden aangeboden moeten open source blijven.

---

*OpenTour — de golfapp die je nodig hebt.*
