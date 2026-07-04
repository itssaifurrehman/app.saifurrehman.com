# DevTools Suite — Design

**Date:** 2026-07-04
**Status:** Approved pending final user review
**Goal:** Convert `jsonValidator/` into a full client-side developer-tools suite at `devtools/`, serving as a personal daily toolbox for frontend and backend work.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Location | New `devtools/` directory | Clean structure; `jsonValidator/index.html` becomes a redirect so old links work |
| Architecture | Zero-build SPA shell, ES modules, no framework | Matches repo conventions; no bundler, no deploy step |
| Routing | Hash routing (`devtools/#/jwt-decoder`) | Zero server config; works on Apache and any local static server; simplest router |
| Backend | None — 100% client-side | Free, private (data never leaves the browser), no Firebase needed |
| Styling | Tailwind CDN (phase 1) | Repo convention; follow-up optimization: purged precompiled stylesheet |
| SEO | Not a goal | Personal toolbox; hash routes acceptable |

## Directory Structure

```
devtools/
├── index.html            # shell: sidebar + main panel + topbar
├── main.js               # boot: renders sidebar from registry, hash router
├── registry.js           # single source of truth: all tools + categories
├── style.css
├── core/                 # shared building blocks
│   ├── editor.js         # textarea + line-numbers component (extracted from jsonValidator)
│   ├── clipboard.js      # copy-to-clipboard with feedback
│   ├── download.js       # download-as-file
│   ├── toast.js          # success/error inline messages
│   ├── storage.js        # namespaced localStorage persistence per tool
│   └── dom.js            # element builders, debounce, AbortController-scoped event binding
└── tools/
    └── <slug>/tool.js    # one folder per tool
```

## Tool Contract

Every tool module exports:

```js
export function render(container, ctx) { ... }   // build UI into container
export function destroy() { ... }                // optional extra cleanup
```

- `ctx` provides: core modules, a per-activation `AbortController` signal, and `storage` scoped to the tool's slug.
- **All event listeners MUST be bound with `{ signal: ctx.signal }`** (via `core/dom.js` helpers). The router aborts the signal before swapping tools — listeners, intervals (via wrapper), and observers die with it. This is the leak-prevention mechanism; `destroy()` exists only for cleanup the signal can't cover (e.g. revoking object URLs).
- Adding a tool = one folder + one `registry.js` entry. Nothing else changes.

## Registry & Router

- `registry.js`: array of `{ slug, name, icon, category, description }`. Drives sidebar, home grid, and router — one list, no duplication.
- Router: on `hashchange`, abort the previous tool's controller, dynamically `import('./tools/<slug>/tool.js')`, call `render`. Unknown slug → home grid. Import failure → inline "tool failed to load" panel; the shell never breaks.
- Lazy loading means the shell's initial payload is just `index.html + main.js + registry.js + core` (~10 KB of JS); tools load on first open and are cached by the module system thereafter.

## UI Shell

- **Sidebar** (collapsible on mobile): filter box at top (type-to-filter tool names), tools grouped under category headers — Backend/API, Text & Data, Frontend/CSS. Active tool highlighted.
- **Main panel:** selected tool's UI; default route shows a home grid of tool cards.
- **Topbar:** current tool title + dark-mode toggle (class strategy, persisted in localStorage).

## Tools

### Phase 1 — migration + native-API tools (no new dependencies)

| Tool | Slug | Implementation |
|------|------|----------------|
| JSON Formatter/Validator/Converter | `json-formatter` | Migrate existing jsonValidator features (js-yaml stays, pinned + SRI) |
| JWT Decoder/Verifier/Signer | `jwt` | jwt.io-style: base64url decode + pretty-print, header/payload panes, expiry status; signature **verify** (HS256/384/512 secret or RS256/ES256 public-key PEM via `crypto.subtle.verify`); **sign** — edit header/payload JSON + secret/private-key PEM → live re-signed token via `crypto.subtle.sign`; example key-pair generator (`crypto.subtle.generateKey`); human-readable claim dates (`iat`/`exp`/`nbf`) |
| Base64 Encode/Decode | `base64` | `TextEncoder`-safe encode/decode (correct UTF-8 handling) |
| URL Encode/Decode | `url-codec` | `encodeURIComponent` family |
| UUID Generator | `uuid` | `crypto.randomUUID()`, bulk count |
| Hash Generator | `hash` | WebCrypto SHA-1/256/512 |
| Timestamp Converter | `timestamp` | epoch ↔ human, both directions, live "now", `Intl` timezones |
| Case Converter | `case-converter` | camel/snake/kebab/Pascal/Title |
| Query-String Parser | `query-string` | `URLSearchParams` → table + JSON |

### Phase 2 — CDN-library and richer-UI tools

- **Text & data:** regex tester (live match highlighting), diff checker (`jsdiff`), cron describer (`cronstrue`), JSON↔CSV, `.env`↔JSON, curl→fetch converter, markdown preview (`marked`, sanitized output), word/char/line counter, slug generator.
- **Frontend/CSS:** color converter + WCAG contrast checker, px↔rem converter, box-shadow/border-radius playground with live CSS output, image→Base64, SVG optimizer, OG meta-tag generator with preview.
- **Dev converters pack:** JSON→TypeScript interfaces (hand-rolled type inference), number base converter (hex/dec/bin/oct), HTML entity encode/decode, string escape/unescape (JSON string escaper), byte-size converter, SQL formatter (`sql-formatter`).
- **Generators pack:** password/secret generator (`crypto.getRandomValues`, charset + entropy display), lorem ipsum, QR code generator (`qrcode`), mock data generator (names/emails/JSON arrays).
- **Backend/network pack:** CIDR/subnet calculator (pure bit math), chmod calculator, HTTP status code + MIME type reference cards (static data).

All phase-2 CDN libraries: version-pinned URLs + SRI `integrity` attributes, loaded lazily by the tool that needs them (not in the shell).

## Data Flow & Persistence

Sidebar click → hash change → router aborts old tool, imports new module, renders. Tool inputs auto-save (debounced 500 ms) to `localStorage` under `devtools:<slug>` and restore on revisit. Each tool gets a "Clear" action that wipes its saved state. Dark-mode preference stored under `devtools:theme`.

## Security

- **XSS:** user input (pasted JSON, JWTs, URLs, SVG) is untrusted. It is never rendered via `innerHTML` — all output goes through `textContent` or `core/dom.js` element builders. SVG optimizer previews render inside a sandboxed `<iframe sandbox>`.
- **No dynamic code:** no `eval`, no `new Function`. Regex tester uses the `RegExp` constructor (pattern compilation, not code execution) with try/catch on invalid patterns.
- **Supply chain:** every CDN script pinned to an exact version with an SRI `integrity` + `crossorigin` attribute.
- **CSP:** `devtools/.htaccess` sets a Content-Security-Policy restricting scripts to `self` + the pinned CDNs, `object-src 'none'`, `base-uri 'self'`. (Tailwind CDN requires `unsafe-inline` styles in phase 1; the precompiled-CSS follow-up removes that.)
- **Privacy:** zero network calls with user data; everything is computed in-browser.
- **Secrets handling:** JWT signing secrets and private-key PEMs are NEVER persisted to localStorage (unlike regular tool inputs) — they live only in memory and vanish on tool switch. Key/secret fields use `autocomplete="off"`.

## Performance

- Lazy per-tool dynamic imports; shell stays ~10 KB of JS.
- Debounced input handlers; no polling; intervals only where visible (live clock in timestamp tool) and killed on tool switch.
- Large-input safety: formatter/diff operations guard on input size (warn > 2 MB) so the tab never locks up.
- Follow-up optimization (post phase 1): replace Tailwind CDN with a purged, precompiled stylesheet committed to the repo.

## Error Handling

- Every parse/convert wrapped in try/catch; failures surface inline via `core/toast.js` with the actual error message (e.g. JSON parse position) — same UX pattern as the current validator.
- Router import failures render an error panel; the shell and other tools are unaffected.
- Invalid/corrupt localStorage state is discarded, never crashes a tool.

## Site Integration

- Root `index.html`: replace the "🧰 Smart Formatter" card with "🛠️ DevTools" → `./devtools/`.
- `jsonValidator/index.html`: replaced with a redirect to `../devtools/#/json-formatter`; the rest of `jsonValidator/` is removed after migration.
- `sitemap.xml`: swap the jsonValidator URL for `devtools/`.

## Testing / Verification

No test framework (repo has none; personal tool). Verification per tool via a smoke checklist: loads from sidebar, happy path, malformed input shows a clear error, persistence restores after reload, dark mode renders correctly, switching away and back leaks nothing (checked via DevTools memory/listeners panel on a sample of tools). Browser-runnable `tests.html` with plain assertions may be added later for tricky logic (CSV edge cases, regex highlighting) — not in scope now.

## Out of Scope

- Accounts, sync, or any server/Firebase integration
- SEO work beyond the sitemap swap
- Build tooling (bundlers, npm) — the precompiled-CSS follow-up uses the standalone Tailwind CLI as a one-off generation step, not a build dependency
