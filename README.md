# clash-monitoring

React client for Clash Monitor. Its account, upgrade, and boost data live in the
browser's IndexedDB, so there is no backend database. An optional local API
backend, kept outside this repository, provides village metadata from the
Supercell API. Production reaches it through a Vercel Function and Tailscale
Funnel.

## Commands

```bash
npm install
npm run dev      # Vite dev server with HMR
npm test         # Vitest suite
npm run build    # tsc -b && vite build
npm run lint     # Oxlint (not type-aware)
npm run preview  # serve the production build
```

The API backend is a separate Node project in `../backend`; see its README for
setup and environment variables. Run both processes when village sync is needed.

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

## Village metadata from the Supercell API

Village names, clans, Town Hall levels, trophies, and leagues can be synced from
the official Clash of Clans API through the RoyaleAPI proxy. The token stays
server-side; it is never sent to the browser.

Production flow:

```text
Browser -> /api/coc/* -> Vercel Function -> cocproxy.royaleapi.dev -> Supercell
```

Local development uses the Vite dev/preview proxy and the separate backend:

```text
Browser -> /api/coc/* -> Vite proxy -> local backend -> cocproxy.royaleapi.dev -> Supercell
```

1. Allowlist `45.79.218.79` (the RoyaleAPI proxy egress IP) on the Supercell API
   key. Your own public IP does not need to be listed.

2. For production, set this Vercel environment variable for Production and
   Preview, then redeploy:

   - `COC_API_TOKEN=<same token as the backend>`

   `LOCAL_COC_API_URL` and `COC_PROXY_SECRET` are no longer used in production.
   No Tailscale Funnel or running laptop is required.

3. For local development, start the backend in a separate terminal:

   ```powershell
   cd ../backend
   npm install
   npm start
   ```

4. Copy `.env.example` to `.env.local` in both projects. Use the same
   `COC_PROXY_SECRET` in both files. The backend also needs `COC_API_TOKEN` and
   `COC_API_BASE=https://cocproxy.royaleapi.dev/v1`.

5. Run `npm run dev` or `npm run preview` from this repository.

The tracker automatically syncs accounts that do not have metadata yet. Use the
`Sinkron desa` button to refresh every village. Player responses are cached for
60 seconds; a manual sync sends `?refresh=1`.

Limitations:

- The RoyaleAPI proxy is a free community service without an SLA. If it is
  unavailable, the manual sync action is hidden and automatic metadata sync is
  skipped; timers and boosts keep working from IndexedDB.
- The official API does not expose active upgrade timers. Timers still come from
  the in-game JSON export.

## Timer behavior

Each upgrade stores an absolute `endsAt` timestamp. The countdown is calculated
from `endsAt - Date.now()` every second, so closing the browser or app does not
pause it. On the next open the remaining time is still correct. There is no
background process and no notification while the app is closed.

Because timers use the device clock, changing the device time shifts the
countdowns. Completed upgrades stay in the village card with a Selesai marker
until you dismiss them with the X button; only then are they removed from
storage. Expired boosts are still cleaned up automatically.

## Routing

The app uses the History API with clean paths, not hash fragments:

- `/` or `/landing` — landing page.
- `/tracker` — tracker page.
- `/fitur`, `/cara-kerja`, `/booster`, `/faq` — landing page scrolled to that section.

Vite serves the SPA fallback in development and preview. A static host needs a
rewrite of unknown paths to `index.html` so direct visits to `/tracker` work.

## Structure

```text
api/
└─ coc/[...path].ts        # Vercel Function proxy to the RoyaleAPI proxy
src/
├─ App.tsx                 # app shell and path routing
├─ main.tsx
├─ index.css               # Tailwind CSS v4 entry and design tokens
├─ pages/                  # Landing and Tracker pages
├─ components/
│  ├─ common/              # shared UI (link, icon, toast, confirm dialog)
│  └─ tracker/             # account card, boost dialog, import modal
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
