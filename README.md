# clash-monitoring

React client for Clash Monitor. It is fully client-side: account, upgrade, and boost
data live in the browser's IndexedDB, so no backend or API server is required.

## Commands

```bash
npm install
npm run dev      # Vite dev server with HMR
npm test         # Vitest suite
npm run build    # tsc -b && vite build
npm run lint     # Oxlint (not type-aware)
npm run preview  # serve the production build
```

## Data storage

The app uses the IndexedDB database `clash-monitor` with three object stores:

- `accounts` — one record per village tag.
- `upgrades` — active build timers, indexed by account and `endsAt`.
- `boosts` — one active booster per account and kind.

IndexedDB is the only source of truth. Data is per browser/origin; it survives
reloads and browser restarts but can be removed by clearing site data or by
browser storage eviction. The app requests persistent storage as a best-effort.

This architecture does not migrate data from the old SQLite backend. Re-import
each village JSON once after upgrading.

## Timer behavior

Each upgrade stores an absolute `endsAt` timestamp. The countdown is calculated
from `endsAt - Date.now()` every second, so closing the browser or app does not
pause it. On the next open the remaining time is still correct. There is no
background process and no notification while the app is closed.

Because timers use the device clock, changing the device time shifts the
countdowns. Expired upgrades are cleaned up when the Monitoring page loads and
are announced once with a toast.

## Structure

```text
src/
├─ App.tsx                 # app shell and hash routing
├─ main.tsx
├─ index.css               # Tailwind CSS v4 entry and design tokens
├─ pages/                  # Landing (Dashboard) and Monitoring pages
├─ components/
│  ├─ common/              # shared UI (icon, toast, confirm dialog)
│  └─ monitoring/          # account card, boost dialog, import modal
└─ lib/                    # formatting, game data, booster math, import parser,
                           # IndexedDB data layer, shared UI classes
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
