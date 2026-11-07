# clash-monitoring

React frontend for Clash Monitor. It reads account and upgrade timer data from the
`clashbe` API and provides a hash-routed landing page and a monitoring page.

## Commands

```bash
npm install
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build
npm run lint     # Oxlint (not type-aware)
npm run preview  # serve the production build
```

The dev and preview servers proxy `/api` to `http://localhost:3000`, so `clashbe`
must be running for the Monitoring page to load data.

## Structure

```text
src/
├─ App.tsx                 # app shell and hash routing
├─ main.tsx
├─ index.css               # Tailwind CSS v4 entry and design tokens
├─ api/                    # API client and shared response types
├─ pages/                  # Landing (Dashboard) and Monitoring pages
├─ components/
│  ├─ common/              # shared UI (icon, toast, confirm dialog)
│  └─ monitoring/          # account card, boost dialog, import modal
└─ lib/                    # formatting, game data, booster specs, shared UI classes
```

## Category headers

Each category header (Desa asal, Laboratorium, Pet, Desa tukang) carries a purple
accent: a 3px bar in the left gutter and a 2px line along the bottom. Both use the
existing `--accent` token and are drawn with pseudo-elements, so the compact header
height and text alignment stay unchanged.

## Boosters

Group headers for Desa asal, Laboratorium, and Pet show a booster button. Once a
booster is active, its countdown badge is clickable: it opens the same dialog in
extension mode, where 1–5 additional hours can be selected. The dialog shows the
current remaining duration and the total after the extension.

While a group booster is active, each upgrade row shows two stacked timers without
text labels:

- The upper gold timer is the normal-speed remaining work, ticking down at the
  booster multiplier (10x or 24x).
- The smaller timer below it is the real wall-clock time until the upgrade finishes.
