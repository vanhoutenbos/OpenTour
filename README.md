# OpenTour 🏌️

> Open source golf tournament and live scoring platform — free for small organizations, paid at scale.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/vanhoutenbos/opentour/actions/workflows/pr.yml/badge.svg)](https://github.com/vanhoutenbos/opentour/actions)

> 🇳🇱 **Are you Dutch?** Welkom! Als je liever je vraagt stelt in het Nederlands, ga je rang! Zorg alleen wel dat je de tag `Dutch` eraan hangt, dan begrijpen onze Engelse lezers dat ze die moeten skippen! ;)
*If you see an issue with the tag `Dutch` than it might be a bit harder to read since the Issue will be mostly spoken in `Dutch`.

## What is OpenTour?

OpenTour lets anyone organize and follow professional-looking golf events — from a casual match between friends or a ladder competition to an official club tournament with hundreds of participants and a live leaderboard.

**Core principles:**

- 🆓 **Actually free** for small organizations, friend groups, and ladder competitions — no hidden paywalls
- 📡 **Live leaderboard** with no app or account needed — just a shared link
- 📴 **Offline-first** score entry — golf courses typically have poor signal
- 🌍 **Open source** (AGPL-3.0) — self-hostable, customizable, transparent
- 🇳🇱 **Dutch-born** — built with NL and EN support from day one

## Current focus

We are currently focussed on getting a 1.0 version running, hunting bugs, squashing them and driving 300 yards!
Feel free to take a peek at the [Milestone](https://github.com/vanhoutenbos/OpenTour/milestone/1) and if you feel like it help us test or build a cool feature!

## Tech stack that OpenTour uses

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Scorer app | PWA (Service Worker + IndexedDB via Dexie.js) |
| Backend | Supabase (Postgres + Auth + RLS) |
| Edge / Cache | Cloudflare Workers + Cache API |
| Hosting | Vercel (free tier) |
| Monorepo | Turborepo |
| License | AGPL-3.0 |

## Quick start

```bash
git clone https://github.com/vanhoutenbos/opentour
cd opentour
npm install
npm run dev
```

See [docs/SETUP.md](docs/SETUP.md) for the full setup guide, including Supabase and Cloudflare configuration.

## Self-hosting

OpenTour can be fully self-hosted via Docker Compose (Supabase OSS). See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md).

Minimum requirements: 2GB RAM, 1 vCPU, 20GB disk.

### BYOD

In theory it should be possible to bring your own device (your PC) run a docker instance on it, expose it to the internet and have the whole ecosystem hosted on your own server!
I haven't tested this though!

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- 🐛 Report bugs via [GitHub Issues](https://github.com/vanhoutenbos/opentour/issues)
- 💡 Discuss ideas via [GitHub Discussions](https://github.com/vanhoutenbos/opentour/discussions)
- 🌐 Translations via community contributions (see `packages/i18n/`)

## License

[AGPL-3.0](LICENSE) — free to use and self-host. Modifications offered as a web service must remain open source.

---

*OpenTour — the golf app you need.*
