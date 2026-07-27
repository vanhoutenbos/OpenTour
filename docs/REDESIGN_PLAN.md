# OpenTour Admin Redesign Plan

## 1. Doel

Minimalistisch, premium, tijdloos ontwerp voor de admin-kant (dashboard + toernooi-beheer).
Geen felle kleuren, geen zware gradients, geen glas-effecten.

## 2. Status: UITGEVOERD

### ✅ Fase 1 — Design Tokens

**`apps/web/app/globals.css`**
- Nieuwe warme crème-achtergrond voor light mode: `rgb(248 246 241)`
- Nieuwe warme donkere achtergrond voor dark mode: `rgb(22 20 18)`
- Kaarten: `rgb(252 250 247)` (light) / `rgb(30 28 25)` (dark)
- Primaire kleur (bosgroen): `rgb(35 75 57)` light / `rgb(140 190 160)` dark
- Accent (zand/goud): `rgb(197 169 106)` — identiek in beide modes
- Nieuwe semantic tokens: `content-body` ipv `content-secondary`
- Google Fonts import: Cormorant Garamond (serif headings) + Inter (body)
- Font-family utilities en typography base styles toegevoegd

**`apps/web/tailwind.config.ts`**
- Nieuwe semantic colors gemapt op CSS variabelen
- Nieuwe font-size schaal: `display`, `heading`, `subheading`, `body`, `caption`, `label`
- Nieuwe spacing tokens: `18`, `22`
- Border-radius tokens: `card` (20px), `button` (12px)
- Subtiele box-shadow: `shadow-card`, `shadow-card-dark`, `shadow-button`
- Max-width token: `max-w-admin` (1600px)

### ✅ Fase 2 — Typography & Base Styles

- `font-serif` utility (Cormorant Garamond)
- `font-sans` utility (Inter)
- `tracking-section` utility (0.12em letter spacing)
- `text-balance` utility
- Heading base styles in globals.css

### ✅ Fase 3 — Component Updates

**`components/Navbar.tsx`**
- Achtergrond: `bg-surface` met `border-b border-border`
- Logo: serif lettertype
- Navigatie items: subtielere hover states met `hover:bg-surface-3`
- Login button: `bg-brand-primary hover:bg-brand-primary-hover`
- Dropdown: `rounded-card` met nieuwe shadow
- Mobiel menu: aangepast styling

**`app/[locale]/dashboard/page.tsx`**
- Breedere layout: `max-w-admin`
- Sectielabel上方: uppercase `text-label text-content-muted`
- Hoofdtitel: `text-heading font-serif text-content`
- Meer witruimte: `py-12` tussen secties
- Stat cards: niet meer in een grid (leeg state), alleen soft cards voor toernooien
- Tournament list: `rounded-card`, `p-5`, subtiele hover border
- Status badges: zachtere tinten met `bg-surface-3` voor concept
- Buttons: `rounded-button`, `bg-brand-primary`

**`app/[locale]/tournament/[id]/manage/page.tsx`**
- Header: `max-w-admin`, `py-6`, serif titel, meer witruimte
- Status acties: `max-w-admin`, `px-6`, buttons met `rounded-button`
- Tabs: `max-w-admin`, `border-brand-primary` voor actieve tab
- Stat cards: `rounded-card`, `p-6`, `text-3xl` cijfers, uppercase labels
- Matchplay sectie: `rounded-card`, `p-6`, nieuwe button styles
- Leaderboard card: `rounded-card`, `p-6`, `text-subheading font-serif`
- Startlijst cards: `rounded-card`, `p-5`, `rounded-button` voor inner items

## 3. Resterende Werkzaamheden (Fase 4+)

### Pagina's die nog aangepast moeten worden
- `app/[locale]/tournament/[id]/page.tsx` — publieke leaderboard
- `app/[locale]/tournament/new/page.tsx` — nieuw toernooi formulier
- `app/[locale]/course/page.tsx` en `course/new/page.tsx` — baan beheer
- `app/[locale]/scorer/page.tsx` — scorer interface

### Componenten die aange past moeten worden
- `components/leaderboard/*.tsx` — leaderboard tabellen, filterbalk
- `components/score-grid/ScoreGrid.tsx` — score grid styling
- `components/scorer/*.tsx` — scorer interface
- `components/home/*.tsx` — publieke homepage (indien gewenst)

### Nieuwe componenten die gebouwd moeten worden
- `components/ui/Card.tsx` — herbruikbare kaart component
- `components/ui/SoftTable.tsx` — soft table voor lijsten
- `components/ui/Badge.tsx` — status badges
- `components/ui/StatCard.tsx` — statistiek kaarten
- `components/ui/Input.tsx` — gestylde formulier inputs

### Overige aanpassingen
- Thema toggle component bijwerken naar nieuwekleuren
- Avatar component bijwerken
- Status banners (PauseBanner, etc.) bijwerken
- LiveBadge bijwerken naar nieuwe esthetiek
- Toegangscodes sectie bijwerken
- Spelers/categories/flights tabellen bijwerken naar soft tables
- Formulieren (edit, add player, etc.) bijwerken

## 4. Kleurenreferentie

| Token | Light | Dark |
|-------|-------|------|
| Achtergrond | `#F8F6F1` | `#161412` |
| Kaarten | `#FCFAF7` | `#1E1C19` |
| Primaire | `#234B39` | `#8CBEA0` |
| Primaire hover | `#1A3A2E` | `#A0D2AF` |
| Accent | `#C5A96A` | `#C5A96A` |
| Tekst primair | `#1E1E1E` | `#EBE9E5` |
| Tekst body | `#666666` | `#B4B0AA` |
| Tekst muted | `#9B9B9B` | `#787470` |
| Border | `#E6E3DE` | `#322E2A` |
| Border strong | `#D7D2CC` | `#413C37` |

## 5. Typografie

- **Headings:** Cormorant Garamond (serif)
- **Body:** Inter (sans-serif)
- **Schaal:** display (3.5rem), heading (2.25rem), subheading (1.5rem), body (1rem), caption (0.875rem), label (0.75rem uppercase met 0.12em letter spacing)

## 6. Layout

- Max breedte: `1600px` (`max-w-admin`)
- Padding tussen secties: `py-12` (48px) of `py-16` (64px)
- Padding inside kaarten: `p-6` (24px) of `p-8` (32px)
- Kaart border-radius: `20px` (`rounded-card`)
- Button border-radius: `12px` (`rounded-button`)
- Navigatie hoogte: `64px` (`h-16`)

---

*Uitvoeringsdatum: 2026-07-27*
*Fase 1-3 voltooid. Fase 4+ kan starten zodra de bovenstaande pagina's en componenten aan de beurt zijn.*
