# Project Instructions

Multi-app static site served at app.saifurrehman.com. The root `index.html` is a launcher page linking to independent mini apps, each in its own directory.

## Tech Stack

- Vanilla JavaScript (ES modules), HTML, CSS — no framework, no bundler, no package.json
- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`)
- Firebase v11.9.1 (Auth + Firestore) imported directly from the gstatic CDN
- Hosted on Apache (see `.htaccess`); deployed as plain static files

## Apps

| Directory | App | Backend |
|-----------|-----|---------|
| `dootsy/` | Todo list | Firebase project `dootsy-6eea0` |
| `jobTracker/` | Job application tracker (+ admin dashboard) | Firebase project `job-tracker-db9d8` |
| `devtools/` | Developer-tools suite (JSON, JWT, Base64, hash, timestamp, UUID, case, query-string) | None — fully client-side |
| `medicine-tracker/` | Medicine dose tracker | Firebase project `broodl-96` |
| `pointly/` | Points/sales ledger with products | Firebase project `pointly-fecd1` |
| `workpad/` | Notepad with auto-save | Firebase project `workpad-3c3eb` |

Each Firebase-backed app has its own isolated Firebase project. Config lives in
`<app>/js/config/config.js` (or `workpad/config/config.js`, `medicine-tracker/firebase-config.js`)
and exports initialized `auth` / `db` / `provider` singletons.

## Conventions

- Module layout per app: `config/` (Firebase init), `auth/` (login/logout, `onAuthStateChanged`), `features/` or app-specific dirs (Firestore CRUD), `ui/` (DOM rendering)
- Firestore data access: exported async functions per operation (`addX`, `getUserX`, `updateX`, `deleteX`); documents are scoped per user via a `userId`/`uid` field and `where` queries
- Firebase SDK imports always use the full gstatic CDN URL, pinned to 11.9.1
- Auth: Google sign-in via `signInWithPopup`; UI gated with `onAuthStateChanged`
- Error handling: try/catch with `console.error`; input guards throw `Error`
- File naming: camelCase for app dirs (`jobTracker`), kebab-case for multi-word files (`job-crud.js`, `add-medicine.html`)
- Commits are short, loosely conventional (`fix:`, `feat:`, `refactor`); work happens directly on `master`
- `devtools/`: SPA shell + hash routing; tools are lazy ES modules under `devtools/tools/<slug>/tool.js` exporting `render(container, ctx)`; pure logic in sibling `lib.js` tested via `node --test devtools/tests/*.test.js`; all listeners bound with `ctx.signal` (leak-free on tool switch); user input rendered only via `textContent`/`el()` — never `innerHTML`; JWT keys never persisted; JWT verify rejects alg/key-type mismatch (alg-confusion hardening)

## Build & Run

- No build step. Serve the root with any static server, e.g. `python3 -m http.server` from the repo root, then open `http://localhost:8000`
- No linter or CI. Tests (devtools only): `node --test devtools/tests/*.test.js`
- Deploy = upload files to Apache host (root has `.htaccess`, `robots.txt`, `sitemap.xml`)

## Cautions

- Firebase web API keys in configs are public by design; actual security relies on Firestore security rules, which live in each Firebase console — not in this repo
- Apps must keep working when opened via relative paths (`./dootsy/index.html`), so keep asset/module paths relative
