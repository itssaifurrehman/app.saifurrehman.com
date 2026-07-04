# DevTools Suite Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `devtools/` — a zero-build, client-side developer-tools SPA with a sidebar shell and 9 tools (JSON formatter, JWT decode/verify/sign, Base64, URL codec, UUID, hash, timestamp, case converter, query-string parser), replacing `jsonValidator/`.

**Architecture:** Static SPA shell (`index.html` + `main.js`) with hash routing; tools are lazy-loaded ES modules under `devtools/tools/<slug>/tool.js` implementing a `render(container, ctx)` contract. Shared primitives live in `devtools/core/`. Leak prevention via a per-activation `AbortController` whose signal scopes every event listener and interval. Pure logic lives in per-tool `lib.js` files tested with Node's built-in test runner (no npm, no framework).

**Tech Stack:** Vanilla JS ES modules, Tailwind CDN, js-yaml 4.1.0 (jsdelivr `+esm`, lazy), WebCrypto, `node --test` for logic tests.

**Spec:** `docs/superpowers/specs/2026-07-04-devtools-suite-design.md`

## Global Constraints

- Working directory for all commands: repo root `/home/craptors/Documents/personal-dev/app.saifurrehman.com`
- Zero build step: no npm, no package.json, no bundler. Tests use only `node --test` (Node ≥ 18; run `node --version` first — if < 18, stop and report).
- User input is untrusted: NEVER assign it via `innerHTML`. All dynamic output through `textContent` or the `el()` builder (which uses `append`, creating text nodes).
- No `eval`, no `new Function`.
- Every event listener inside a tool MUST pass `{ signal }` from `ctx.signal` (use `on()` / `every()` from `core/dom.js`).
- JWT secrets and private-key PEMs are NEVER persisted to localStorage; key fields get `autocomplete="off"`.
- localStorage keys namespaced `devtools:<slug>`.
- CDN scripts pinned to exact versions. `<script>` tags get SRI where the CDN supports it; dynamic `import()` of CDN ESM is host-restricted by CSP instead (SRI is not supported on dynamic import).
- Follow repo commit style: short conventional messages (`feat: ...`, `fix: ...`), committed directly on `master`. End commit messages with the Claude co-author trailer.
- Manual browser verification: serve with `python3 -m http.server 8000` from repo root, open `http://localhost:8000/devtools/`. (A Playwright MCP browser may be used instead of a human-driven browser; check the same assertions.)

## File Structure (end state)

```
devtools/
├── .htaccess              # CSP headers (Task 11)
├── index.html             # shell (Task 3)
├── tw-config.js           # Tailwind config + early theme init (Task 3)
├── style.css              # editor + scrollbar styles (Task 3)
├── main.js                # sidebar, router, theme (Task 3)
├── registry.js            # tool manifest (Task 3)
├── core/
│   ├── dom.js             # el/on/every/debounce (Task 1)
│   ├── storage.js         # namespaced localStorage (Task 1)
│   ├── toast.js           # inline messages (Task 2)
│   ├── clipboard.js       # copy w/ feedback (Task 2)
│   ├── download.js        # save-as-file (Task 2)
│   └── editor.js          # textarea + line numbers (Task 2)
├── tests/                 # node --test files (Tasks 1,4,5,7,8,9,10)
└── tools/
    ├── json-formatter/{lib.js,tool.js}   # Task 4
    ├── jwt/{lib.js,tool.js}              # Tasks 5,6
    ├── base64/{lib.js,tool.js}           # Task 7
    ├── url-codec/{lib.js,tool.js}        # Task 7
    ├── uuid/tool.js                      # Task 8
    ├── hash/{lib.js,tool.js}             # Task 8
    ├── timestamp/{lib.js,tool.js}        # Task 9
    ├── case-converter/{lib.js,tool.js}   # Task 10
    └── query-string/{lib.js,tool.js}     # Task 10
```

Run all tests any time with: `node --test devtools/tests/`

---

### Task 1: Core primitives — `dom.js`, `storage.js`

**Files:**
- Create: `devtools/core/dom.js`
- Create: `devtools/core/storage.js`
- Test: `devtools/tests/core.test.js`

**Interfaces:**
- Produces: `el(tag, attrs?, children?) -> HTMLElement` (attrs keys: `class`, `text`, `dataset`, anything else via setAttribute; children: node/string or array of them); `on(target, type, handler, signal)`; `every(ms, fn, signal)`; `debounce(fn, ms=500) -> Function`; `createStorage(slug, backend?) -> { load(): any|null, save(value): void, clear(): void }`.

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/core.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { debounce } from "../core/dom.js";
import { createStorage } from "../core/storage.js";

function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test("debounce collapses rapid calls into the last one", async () => {
  let calls = [];
  const fn = debounce((v) => calls.push(v), 20);
  fn(1); fn(2); fn(3);
  await sleep(60);
  assert.deepEqual(calls, [3]);
});

test("storage round-trips values under the namespaced key", () => {
  const backend = memoryBackend();
  const s = createStorage("demo", backend);
  s.save({ a: 1 });
  assert.deepEqual(s.load(), { a: 1 });
  assert.equal(backend.getItem("devtools:demo"), '{"a":1}');
  s.clear();
  assert.equal(s.load(), null);
});

test("storage returns null and self-heals on corrupt JSON", () => {
  const backend = memoryBackend();
  backend.setItem("devtools:demo", "{not json");
  const s = createStorage("demo", backend);
  assert.equal(s.load(), null);
  assert.equal(backend.getItem("devtools:demo"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — `Cannot find module` for `../core/dom.js`

- [ ] **Step 3: Write the implementation**

```js
// devtools/core/dom.js
// DOM helpers. All dynamic content goes through textContent / append (text
// nodes), never innerHTML — user input is untrusted.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) node.append(child);
  return node;
}

export function on(target, type, handler, signal) {
  target.addEventListener(type, handler, { signal });
}

export function every(ms, fn, signal) {
  const id = setInterval(fn, ms);
  signal.addEventListener("abort", () => clearInterval(id), { once: true });
}

export function debounce(fn, ms = 500) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
```

```js
// devtools/core/storage.js
const PREFIX = "devtools:";

export function createStorage(slug, backend = globalThis.localStorage) {
  const key = PREFIX + slug;
  return {
    load() {
      try {
        const raw = backend.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch {
        try { backend.removeItem(key); } catch { /* quota/security: ignore */ }
        return null;
      }
    },
    save(value) {
      try { backend.setItem(key, JSON.stringify(value)); } catch { /* quota: ignore */ }
    },
    clear() {
      try { backend.removeItem(key); } catch { /* ignore */ }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test devtools/tests/`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add devtools/core/dom.js devtools/core/storage.js devtools/tests/core.test.js
git commit -m "feat: devtools core primitives (dom, storage) with node tests"
```

---

### Task 2: Core UI modules — `toast.js`, `clipboard.js`, `download.js`, `editor.js`

**Files:**
- Create: `devtools/core/toast.js`
- Create: `devtools/core/clipboard.js`
- Create: `devtools/core/download.js`
- Create: `devtools/core/editor.js`

**Interfaces:**
- Consumes: `el`, `on` from `core/dom.js`.
- Produces: `toast(message, kind = "info"|"success"|"error")`, `hideToast()`; `copyText(text): Promise<void>`; `downloadText(filename, text, mime="text/plain")`; `createEditor({ placeholder, signal, oninput }) -> { root: HTMLElement, value (get/set), focus() }`.
- These are DOM-bound; they're verified in the browser in Task 3 (no Node tests).

- [ ] **Step 1: Write `toast.js`**

```js
// devtools/core/toast.js
// Renders into the #toast element owned by the shell. Errors persist until
// the next toast or route change; success/info auto-hide.
const KIND_CLASSES = {
  info: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};
let timer;

export function toast(message, kind = "info") {
  const box = document.getElementById("toast");
  if (!box) return;
  box.textContent = message;
  box.className =
    "mx-4 md:mx-6 mt-3 px-4 py-2 rounded-md text-sm font-medium " +
    (KIND_CLASSES[kind] || KIND_CLASSES.info);
  clearTimeout(timer);
  if (kind !== "error") timer = setTimeout(hideToast, 3000);
}

export function hideToast() {
  const box = document.getElementById("toast");
  if (!box) return;
  box.textContent = "";
  box.className = "hidden";
}
```

- [ ] **Step 2: Write `clipboard.js` and `download.js`**

```js
// devtools/core/clipboard.js
import { toast } from "./toast.js";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard", "success");
  } catch (err) {
    toast(`Copy failed: ${err.message}`, "error");
  }
}
```

```js
// devtools/core/download.js
export function downloadText(filename, text, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Write `editor.js`**

```js
// devtools/core/editor.js
// Monospace textarea with a synced line-number gutter (extracted from the
// old jsonValidator). Styles live in devtools/style.css (.editor*).
import { el, on } from "./dom.js";

export function createEditor({ placeholder = "", signal, oninput } = {}) {
  const lines = el("div", { class: "editor-lines", text: "1" });
  const textarea = el("textarea", {
    class: "editor-input",
    placeholder,
    spellcheck: "false",
    autocapitalize: "off",
    autocomplete: "off",
  });
  const root = el("div", { class: "editor" }, [lines, textarea]);

  const sync = () => {
    const count = textarea.value.split("\n").length;
    lines.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
    lines.scrollTop = textarea.scrollTop;
  };
  on(textarea, "input", () => { sync(); oninput?.(textarea.value); }, signal);
  on(textarea, "scroll", () => { lines.scrollTop = textarea.scrollTop; }, signal);

  return {
    root,
    get value() { return textarea.value; },
    set value(v) { textarea.value = v; sync(); },
    focus: () => textarea.focus(),
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add devtools/core/toast.js devtools/core/clipboard.js devtools/core/download.js devtools/core/editor.js
git commit -m "feat: devtools core UI modules (toast, clipboard, download, editor)"
```

---

### Task 3: Shell — `index.html`, `tw-config.js`, `style.css`, `registry.js`, `main.js`

**Files:**
- Create: `devtools/index.html`
- Create: `devtools/tw-config.js`
- Create: `devtools/style.css`
- Create: `devtools/registry.js`
- Create: `devtools/main.js`

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces: the `ctx` object handed to every tool's `render(container, ctx)`: `{ signal, storage, toast, hideToast, copyText, downloadText, createEditor, el, on, every, debounce }`. Tool modules must export `render(container, ctx)` and may export `destroy()`.

- [ ] **Step 1: Write `registry.js`**

```js
// devtools/registry.js
// Single source of truth for tools. Adding a tool = add an entry here +
// create devtools/tools/<slug>/tool.js. Nothing else changes.
export const CATEGORIES = ["Backend & API", "Text & Data", "Frontend & CSS"];

export const TOOLS = [
  { slug: "json-formatter", name: "JSON Formatter", icon: "🧰", category: "Text & Data",
    description: "Format, validate, minify and convert JSON, YAML and XML." },
  { slug: "jwt", name: "JWT Decode & Sign", icon: "🔏", category: "Backend & API",
    description: "Decode, verify and sign JSON Web Tokens — entirely in your browser." },
  { slug: "base64", name: "Base64", icon: "🔡", category: "Backend & API",
    description: "UTF-8-safe Base64 encode and decode." },
  { slug: "url-codec", name: "URL Encode/Decode", icon: "🔗", category: "Backend & API",
    description: "Encode or decode URL components and full URIs." },
  { slug: "uuid", name: "UUID Generator", icon: "🆔", category: "Backend & API",
    description: "Generate v4 UUIDs, one or in bulk." },
  { slug: "hash", name: "Hash Generator", icon: "#️⃣", category: "Backend & API",
    description: "SHA-1, SHA-256 and SHA-512 digests via WebCrypto." },
  { slug: "timestamp", name: "Timestamp Converter", icon: "⏱️", category: "Backend & API",
    description: "Epoch ↔ human dates, with live clock and relative time." },
  { slug: "case-converter", name: "Case Converter", icon: "🔀", category: "Text & Data",
    description: "camelCase, PascalCase, snake_case, kebab-case, Title Case." },
  { slug: "query-string", name: "Query String Parser", icon: "❓", category: "Backend & API",
    description: "Parse URL query strings into a table and JSON." },
];
```

(The "Frontend & CSS" category is intentionally empty in phase 1; the sidebar hides empty categories, and phase 2 fills it.)

- [ ] **Step 2: Write `tw-config.js`**

```js
// devtools/tw-config.js
// Plain script (not a module): configures the Tailwind Play CDN and applies
// the saved theme before first paint. External file keeps CSP free of
// 'unsafe-inline' for scripts.
tailwind.config = { darkMode: "class" };
try {
  if (localStorage.getItem("devtools:theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) { /* storage blocked: default to light */ }
```

- [ ] **Step 3: Write `style.css`**

```css
/* devtools/style.css — component styles Tailwind utilities can't express */
.editor {
  display: flex;
  height: 420px;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  background: #ffffff;
}
.dark .editor { background: #0f172a; border-color: #334155; }
.editor-lines {
  padding: 0.5rem 0.75rem;
  min-width: 2.5rem;
  text-align: right;
  color: #94a3b8;
  background: #f1f5f9;
  user-select: none;
  overflow: hidden;
  white-space: pre;
  line-height: 1.25rem;
}
.dark .editor-lines { background: #1e293b; }
.editor-input {
  flex: 1;
  padding: 0.5rem 1rem;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  line-height: 1.25rem;
  white-space: pre;
  overflow: auto;
}
.tool-output {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-all;
}
```

- [ ] **Step 4: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevTools — client-side developer toolbox</title>
  <meta name="description" content="Fast, private developer tools that run entirely in your browser." />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="./tw-config.js"></script>
  <link rel="stylesheet" href="./style.css" />
</head>
<body class="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen">
  <div class="flex min-h-screen">
    <aside id="sidebar"
      class="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hidden md:flex flex-col">
      <a href="#" class="px-4 py-4 text-lg font-bold text-violet-700 dark:text-violet-300">🛠️ DevTools</a>
      <input id="toolFilter" type="search" placeholder="Filter tools…"
        class="mx-3 mb-2 px-3 py-1.5 rounded-md text-sm border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-400" />
      <nav id="toolNav" class="flex-1 overflow-y-auto px-2 pb-4"></nav>
    </aside>
    <div class="flex-1 flex flex-col min-w-0">
      <header class="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <button id="menuBtn" class="md:hidden text-xl" aria-label="Toggle menu">☰</button>
        <h1 id="toolTitle" class="text-lg font-semibold flex-1 truncate">All tools</h1>
        <button id="themeBtn" class="text-xl" aria-label="Toggle dark mode">🌙</button>
      </header>
      <div id="toast" class="hidden" role="status" aria-live="polite"></div>
      <main id="toolPanel" class="flex-1 overflow-y-auto p-4 md:p-6"></main>
    </div>
  </div>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Write `main.js`**

```js
// devtools/main.js — sidebar, hash router, theme. Tools are lazy-loaded ES
// modules; each activation gets an AbortController so switching tools
// removes every listener/interval the tool registered.
import { CATEGORIES, TOOLS } from "./registry.js";
import { el, on, every, debounce } from "./core/dom.js";
import { createStorage } from "./core/storage.js";
import { toast, hideToast } from "./core/toast.js";
import { copyText } from "./core/clipboard.js";
import { downloadText } from "./core/download.js";
import { createEditor } from "./core/editor.js";

const nav = document.getElementById("toolNav");
const panel = document.getElementById("toolPanel");
const title = document.getElementById("toolTitle");

let controller = null;
let activeModule = null;

const currentSlug = () => location.hash.replace(/^#\/?/, "") || null;

function renderNav(filter = "") {
  const q = filter.trim().toLowerCase();
  nav.replaceChildren();
  for (const category of CATEGORIES) {
    const tools = TOOLS.filter(
      (t) => t.category === category && (!q || t.name.toLowerCase().includes(q))
    );
    if (!tools.length) continue;
    nav.append(el("h2", {
      class: "px-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400",
      text: category,
    }));
    for (const t of tools) {
      nav.append(el("a", {
        href: `#/${t.slug}`,
        class: "tool-link flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-violet-50 dark:hover:bg-slate-700",
        dataset: { slug: t.slug },
      }, `${t.icon} ${t.name}`));
    }
  }
  highlightActive();
}

function highlightActive() {
  const slug = currentSlug();
  for (const link of nav.querySelectorAll(".tool-link")) {
    link.classList.toggle("bg-violet-100", link.dataset.slug === slug);
    link.classList.toggle("dark:bg-slate-700", link.dataset.slug === slug);
    link.classList.toggle("font-semibold", link.dataset.slug === slug);
  }
}

function renderHome() {
  title.textContent = "All tools";
  document.title = "DevTools — client-side developer toolbox";
  const grid = el("div", { class: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" });
  for (const t of TOOLS) {
    grid.append(el("a", {
      href: `#/${t.slug}`,
      class: "block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-violet-500 hover:shadow-md transition-all",
    }, [
      el("h3", { class: "font-semibold mb-1", text: `${t.icon} ${t.name}` }),
      el("p", { class: "text-sm text-slate-500 dark:text-slate-400", text: t.description }),
    ]));
  }
  panel.append(grid);
}

async function route() {
  controller?.abort();
  activeModule?.destroy?.();
  activeModule = null;
  controller = new AbortController();
  const { signal } = controller;
  hideToast();
  panel.replaceChildren();

  const slug = currentSlug();
  highlightActive();
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) { renderHome(); return; }

  title.textContent = tool.name;
  document.title = `${tool.name} — DevTools`;
  try {
    const mod = await import(`./tools/${tool.slug}/tool.js`);
    if (signal.aborted) return; // user navigated away mid-load
    activeModule = mod;
    mod.render(panel, {
      signal,
      storage: createStorage(tool.slug),
      toast, hideToast, copyText, downloadText, createEditor,
      el, on, every, debounce,
    });
  } catch (err) {
    if (signal.aborted) return;
    console.error(err);
    panel.append(el("div", {
      class: "p-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200",
      text: `Failed to load tool "${slug}": ${err.message}`,
    }));
  }
}

// Theme toggle
document.getElementById("themeBtn").addEventListener("click", () => {
  const dark = document.documentElement.classList.toggle("dark");
  try { localStorage.setItem("devtools:theme", dark ? "dark" : "light"); } catch { /* ignore */ }
});

// Mobile sidebar toggle
document.getElementById("menuBtn").addEventListener("click", () => {
  const sb = document.getElementById("sidebar");
  sb.classList.toggle("hidden");
  sb.classList.toggle("flex");
});

// Sidebar filter
document.getElementById("toolFilter").addEventListener("input", (e) => renderNav(e.target.value));

window.addEventListener("hashchange", route);
renderNav();
route();
```

- [ ] **Step 6: Verify in browser**

Run: `python3 -m http.server 8000` (from repo root, keep running in background)
Open `http://localhost:8000/devtools/` and check:
- Home grid shows 9 tool cards; sidebar shows "Backend & API" and "Text & Data" groups (no empty "Frontend & CSS" header).
- Typing `jwt` in the filter box narrows the sidebar to the JWT entry.
- Clicking any tool shows the red "Failed to load tool …" panel (tools don't exist yet) — the shell must NOT break; clicking the logo returns home.
- Dark-mode button toggles theme; reload preserves it.
- Browser console shows no errors other than the expected failed dynamic imports.

- [ ] **Step 7: Commit**

```bash
git add devtools/index.html devtools/tw-config.js devtools/style.css devtools/registry.js devtools/main.js
git commit -m "feat: devtools shell with sidebar, hash router, theme toggle"
```

---

### Task 4: JSON Formatter tool

**Files:**
- Create: `devtools/tools/json-formatter/lib.js`
- Create: `devtools/tools/json-formatter/tool.js`
- Test: `devtools/tests/json-formatter.test.js`

**Interfaces:**
- Produces (lib.js): `parseJson(text) -> {ok:true,value} | {ok:false,error:{message,line,col}}`; `formatJson(text) -> string` (throws on invalid); `minifyJson(text) -> string` (throws); `jsonToXml(value, tag="root", depth=0) -> string`; `stats(text) -> {bytes, lines, chars}`.
- tool.js exports `render(container, ctx)`.

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/json-formatter.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJson, formatJson, minifyJson, jsonToXml, stats } from "../tools/json-formatter/lib.js";

test("parseJson reports line and column for invalid JSON", () => {
  const r = parseJson('{\n  "a": 1,\n  "b" 2\n}');
  assert.equal(r.ok, false);
  assert.equal(r.error.line, 3);
  assert.ok(r.error.message.length > 0);
});

test("formatJson pretty-prints with 2-space indent", () => {
  assert.equal(formatJson('{"a":[1,2]}'), '{\n  "a": [\n    1,\n    2\n  ]\n}');
});

test("minifyJson strips whitespace", () => {
  assert.equal(minifyJson('{ "a" : 1 }'), '{"a":1}');
});

test("jsonToXml escapes content and sanitizes tag names", () => {
  const xml = jsonToXml({ "bad key": "<hi>", n: [1] });
  assert.ok(xml.includes("<bad_key>&lt;hi&gt;</bad_key>"));
  assert.ok(xml.includes("<item>1</item>"));
  assert.ok(xml.startsWith("<root>"));
});

test("stats counts bytes, lines, chars", () => {
  assert.deepEqual(stats("ab\né"), { bytes: 5, lines: 2, chars: 4 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — cannot find `../tools/json-formatter/lib.js`

- [ ] **Step 3: Write `lib.js`**

```js
// devtools/tools/json-formatter/lib.js — pure logic, no DOM. YAML conversion
// lives in tool.js because it needs the lazily-loaded js-yaml CDN module.

export function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    let line = null, col = null;
    const m = /position (\d+)/.exec(err.message);
    if (m) {
      const before = text.slice(0, Number(m[1])).split("\n");
      line = before.length;
      col = before.at(-1).length + 1;
    }
    return { ok: false, error: { message: err.message, line, col } };
  }
}

export function formatJson(text) {
  return JSON.stringify(JSON.parse(text), null, 2);
}

export function minifyJson(text) {
  return JSON.stringify(JSON.parse(text));
}

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

const safeTag = (k) => {
  const t = String(k).replace(/[^A-Za-z0-9_.-]/g, "_");
  return /^[A-Za-z_]/.test(t) ? t : "_" + t;
};

export function jsonToXml(value, tag = "root", depth = 0) {
  const pad = "  ".repeat(depth);
  if (value === null || typeof value !== "object") {
    return `${pad}<${tag}>${escapeXml(value ?? "")}</${tag}>`;
  }
  const entries = Array.isArray(value)
    ? value.map((v) => jsonToXml(v, "item", depth + 1))
    : Object.entries(value).map(([k, v]) => jsonToXml(v, safeTag(k), depth + 1));
  if (!entries.length) return `${pad}<${tag}/>`;
  return `${pad}<${tag}>\n${entries.join("\n")}\n${pad}</${tag}>`;
}

export function stats(text) {
  return {
    bytes: new TextEncoder().encode(text).length,
    lines: text ? text.split("\n").length : 0,
    chars: text.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test devtools/tests/`
Expected: PASS (all tests so far)

- [ ] **Step 5: Write `tool.js`**

```js
// devtools/tools/json-formatter/tool.js
import { parseJson, formatJson, minifyJson, jsonToXml, stats } from "./lib.js";

const MAX_BYTES = 2 * 1024 * 1024; // warn above 2 MB so the tab never locks

let yamlLib = null;
async function yaml() {
  // Pinned version; host is allowlisted in devtools/.htaccess CSP. SRI is not
  // supported on dynamic import — version pin + CSP host restriction instead.
  yamlLib ??= (await import("https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm")).default;
  return yamlLib;
}

export function render(container, ctx) {
  const { el, on, debounce, createEditor, storage, toast, copyText, downloadText, signal } = ctx;

  const editor = createEditor({
    placeholder: "Paste JSON or YAML here…",
    signal,
    oninput: debounce(update, 500),
  });
  const statsBar = el("div", {
    class: "mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono",
  });

  const btn = (label, cls, handler) => {
    const b = el("button", {
      class: `py-2 px-3 rounded-md text-sm text-white ${cls}`,
      text: label, type: "button",
    });
    on(b, "click", handler, signal);
    return b;
  };

  // guard: size-check, run (possibly async) action, surface errors as toasts
  const guard = (fn) => async () => {
    const text = editor.value;
    if (stats(text).bytes > MAX_BYTES) {
      toast("Input larger than 2 MB — refusing to lock up the tab.", "error");
      return;
    }
    try { await fn(text); } catch (err) { toast(err.message, "error"); }
    update();
  };

  const toJsonValue = async (text) => {
    const r = parseJson(text);
    if (r.ok) return r.value;
    return (await yaml()).load(text); // YAML fallback; throws its own error
  };

  const buttons = el("div", { class: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm" }, [
    btn("Format", "bg-cyan-600 hover:bg-cyan-700", guard((t) => { editor.value = formatJson(t); toast("Formatted", "success"); })),
    btn("Validate", "bg-green-600 hover:bg-green-700", guard((t) => {
      const r = parseJson(t);
      if (r.ok) toast("Valid JSON ✓", "success");
      else toast(r.error.line ? `Invalid JSON at line ${r.error.line}, column ${r.error.col}: ${r.error.message}` : `Invalid JSON: ${r.error.message}`, "error");
    })),
    btn("Minify", "bg-orange-500 hover:bg-orange-600", guard((t) => { editor.value = minifyJson(t); toast("Minified", "success"); })),
    btn("To JSON", "bg-slate-600 hover:bg-slate-700", guard(async (t) => {
      editor.value = JSON.stringify(await toJsonValue(t), null, 2); toast("Converted to JSON", "success");
    })),
    btn("To YAML", "bg-yellow-500 hover:bg-yellow-600", guard(async (t) => {
      editor.value = (await yaml()).dump(await toJsonValue(t)); toast("Converted to YAML", "success");
    })),
    btn("To XML", "bg-blue-600 hover:bg-blue-700", guard(async (t) => {
      editor.value = jsonToXml(await toJsonValue(t)); toast("Converted to XML", "success");
    })),
    btn("Copy", "bg-slate-700 hover:bg-slate-800", () => copyText(editor.value)),
    btn("Download", "bg-purple-600 hover:bg-purple-700", () => downloadText("data.txt", editor.value)),
  ]);

  const clear = el("button", { class: "mt-3 text-xs text-slate-400 hover:text-red-500 underline", text: "Clear input & saved state", type: "button" });
  on(clear, "click", () => { editor.value = ""; storage.clear(); update(); }, signal);

  function update() {
    const s = stats(editor.value);
    statsBar.replaceChildren(
      el("span", { text: `${s.bytes} bytes` }),
      el("span", { text: `${s.chars} chars` }),
      el("span", { text: `${s.lines} lines` }),
    );
    storage.save({ input: editor.value });
  }

  editor.value = storage.load()?.input ?? "";
  update();
  container.append(editor.root, buttons, statsBar, clear);
  editor.focus();
}
```

- [ ] **Step 6: Verify in browser**

Open `http://localhost:8000/devtools/#/json-formatter`:
- Paste `{"a":1}` → Format produces indented JSON; stats update; reload page → input restored.
- Paste `{"a" 1}` → Validate shows an error toast with line/column.
- Paste `a: 1` (YAML) → "To JSON" converts (first click loads js-yaml from CDN — check the Network tab shows the pinned 4.1.0 URL).
- To XML on `{"x":[1,2]}` → `<root>` / `<item>` output. Copy and Download work. Clear wipes state.

- [ ] **Step 7: Commit**

```bash
git add devtools/tools/json-formatter/ devtools/tests/json-formatter.test.js
git commit -m "feat: JSON formatter tool (format, validate, minify, YAML/XML convert)"
```

---

### Task 5: JWT crypto library

**Files:**
- Create: `devtools/tools/jwt/lib.js`
- Test: `devtools/tests/jwt.test.js`

**Interfaces:**
- Produces: `b64urlEncode(Uint8Array) -> string`; `b64urlDecode(string) -> Uint8Array`; `decodeJwt(token) -> {header, payload, signature, signingInput}` (throws with clear message); `signJwt(header, payload, keyText) -> Promise<string>`; `verifyJwt(token, keyText) -> Promise<boolean>`; `generateRsaKeyPair() -> Promise<{privatePem, publicPem}>`; `SUPPORTED_ALGS` (array: HS256, HS384, HS512, RS256, ES256).
- Key input rules: HS\* → `keyText` is the raw secret string; RS256/ES256 → PEM (`PRIVATE KEY` pkcs8 for sign, `PUBLIC KEY` spki for verify).

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/jwt.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

const { decodeJwt, signJwt, verifyJwt, generateRsaKeyPair, b64urlEncode, b64urlDecode } =
  await import("../tools/jwt/lib.js");

test("b64url round-trips arbitrary bytes", () => {
  const bytes = Uint8Array.from([0, 1, 250, 251, 252, 253, 254, 255]);
  assert.deepEqual(b64urlDecode(b64urlEncode(bytes)), bytes);
});

test("HS256 sign → decode → verify round-trip", async () => {
  const token = await signJwt({ alg: "HS256", typ: "JWT" }, { sub: "42", name: "saif" }, "top-secret");
  const { header, payload } = decodeJwt(token);
  assert.equal(header.alg, "HS256");
  assert.equal(payload.name, "saif");
  assert.equal(await verifyJwt(token, "top-secret"), true);
  assert.equal(await verifyJwt(token, "wrong-secret"), false);
});

test("tampered payload fails verification", async () => {
  const token = await signJwt({ alg: "HS256", typ: "JWT" }, { admin: false }, "s");
  const [h, , s] = token.split(".");
  const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ admin: true })));
  assert.equal(await verifyJwt(`${h}.${forged}.${s}`, "s"), false);
});

test("RS256: generated key pair signs and verifies", async () => {
  const { privatePem, publicPem } = await generateRsaKeyPair();
  assert.ok(privatePem.includes("BEGIN PRIVATE KEY"));
  const token = await signJwt({ alg: "RS256", typ: "JWT" }, { iss: "me" }, privatePem);
  assert.equal(await verifyJwt(token, publicPem), true);
});

test("decodeJwt rejects malformed tokens with a clear error", () => {
  assert.throws(() => decodeJwt("only.two"), /3 dot-separated parts/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — cannot find `../tools/jwt/lib.js`

- [ ] **Step 3: Write `lib.js`**

```js
// devtools/tools/jwt/lib.js — JWT decode/verify/sign on pure WebCrypto.
// Works in browsers and Node (tests shim globalThis.crypto for Node < 19).
const te = new TextEncoder();
const td = new TextDecoder();

export const SUPPORTED_ALGS = ["HS256", "HS384", "HS512", "RS256", "ES256"];

const HASH = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512", RS256: "SHA-256", ES256: "SHA-256" };

export function b64urlEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str) {
  const rem = str.length % 4;
  if (rem === 1) throw new Error("Invalid base64url length");
  const pad = rem === 2 ? "==" : rem === 3 ? "=" : "";
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("A JWT must have 3 dot-separated parts (header.payload.signature)");
  let header, payload;
  try { header = JSON.parse(td.decode(b64urlDecode(parts[0]))); }
  catch { throw new Error("Header is not valid base64url-encoded JSON"); }
  try { payload = JSON.parse(td.decode(b64urlDecode(parts[1]))); }
  catch { throw new Error("Payload is not valid base64url-encoded JSON"); }
  return { header, payload, signature: parts[2], signingInput: `${parts[0]}.${parts[1]}` };
}

function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!b64) throw new Error("Empty or malformed PEM");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function algParams(alg) {
  if (alg.startsWith("HS")) return { name: "HMAC" };
  if (alg === "RS256") return { name: "RSASSA-PKCS1-v1_5" };
  if (alg === "ES256") return { name: "ECDSA", hash: "SHA-256" };
  throw new Error(`Unsupported algorithm: ${alg}. Supported: ${SUPPORTED_ALGS.join(", ")}`);
}

async function importKeyFor(alg, keyText, usage) {
  if (!SUPPORTED_ALGS.includes(alg)) {
    throw new Error(`Unsupported algorithm: ${alg}. Supported: ${SUPPORTED_ALGS.join(", ")}`);
  }
  if (alg.startsWith("HS")) {
    return crypto.subtle.importKey("raw", te.encode(keyText), { name: "HMAC", hash: HASH[alg] }, false, [usage]);
  }
  const format = usage === "sign" ? "pkcs8" : "spki";
  const importParams = alg === "RS256"
    ? { name: "RSASSA-PKCS1-v1_5", hash: HASH[alg] }
    : { name: "ECDSA", namedCurve: "P-256" };
  return crypto.subtle.importKey(format, pemToBytes(keyText), importParams, false, [usage]);
}

export async function signJwt(header, payload, keyText) {
  const key = await importKeyFor(header.alg, keyText, "sign");
  const input = `${b64urlEncode(te.encode(JSON.stringify(header)))}.${b64urlEncode(te.encode(JSON.stringify(payload)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign(algParams(header.alg), key, te.encode(input)));
  return `${input}.${b64urlEncode(sig)}`;
}

export async function verifyJwt(token, keyText) {
  const { header, signature, signingInput } = decodeJwt(token);
  const key = await importKeyFor(header.alg, keyText, "verify");
  try {
    return await crypto.subtle.verify(algParams(header.alg), key, b64urlDecode(signature), te.encode(signingInput));
  } catch {
    return false; // malformed signature bytes → invalid, not a crash
  }
}

function toPem(bytes, label) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  const lines = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

export async function generateRsaKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]
  );
  return {
    privatePem: toPem(new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey)), "PRIVATE KEY"),
    publicPem: toPem(new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey)), "PUBLIC KEY"),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test devtools/tests/`
Expected: PASS (all tests, including the RSA round-trip — keygen takes a second or two)

- [ ] **Step 5: Commit**

```bash
git add devtools/tools/jwt/lib.js devtools/tests/jwt.test.js
git commit -m "feat: JWT lib — decode, HS/RS/ES sign+verify, keygen via WebCrypto"
```

---

### Task 6: JWT tool UI

**Files:**
- Create: `devtools/tools/jwt/tool.js`

**Interfaces:**
- Consumes: everything from `./lib.js` (Task 5) and `ctx` (Task 3).
- SECURITY: persist ONLY the token and the sign-pane header/payload JSON. NEVER persist the secret/PEM fields; they get `autocomplete="off"`.

- [ ] **Step 1: Write `tool.js`**

```js
// devtools/tools/jwt/tool.js
import { decodeJwt, signJwt, verifyJwt, generateRsaKeyPair, SUPPORTED_ALGS } from "./lib.js";

const CLAIM_DATES = ["iat", "exp", "nbf"];

export function render(container, ctx) {
  const { el, on, debounce, storage, toast, copyText, signal } = ctx;
  const saved = storage.load() ?? {};

  const field = (labelText, node) =>
    el("label", { class: "block mb-3" }, [
      el("span", { class: "block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1", text: labelText }),
      node,
    ]);
  const area = (attrs) => el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    spellcheck: "false", autocomplete: "off", ...attrs,
  });
  const pre = () => el("pre", { class: "tool-output rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 min-h-[3rem]" });
  const badge = () => el("span", { class: "hidden" });

  const setBadge = (b, ok, textOk, textBad) => {
    b.textContent = ok ? textOk : textBad;
    b.className = "inline-block px-2 py-0.5 rounded text-xs font-semibold " +
      (ok ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100");
  };

  // ---------- Decode & Verify pane ----------
  const tokenIn = area({ rows: "5", placeholder: "Paste a JWT (xxx.yyy.zzz)…" });
  tokenIn.value = saved.token ?? "";
  const headerOut = pre();
  const payloadOut = pre();
  const claimsOut = el("div", { class: "text-sm space-y-1" });
  const expBadge = badge();
  const verifyKeyIn = area({ rows: "4", placeholder: "Secret (HS*) or PUBLIC KEY PEM (RS256/ES256) — never saved" });
  const verifyBadge = badge();
  const verifyBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-violet-600 hover:bg-violet-700", text: "Verify signature", type: "button" });

  function renderDecode() {
    storage.save({ ...storage.load(), token: tokenIn.value });
    headerOut.textContent = payloadOut.textContent = "";
    claimsOut.replaceChildren();
    expBadge.className = "hidden";
    if (!tokenIn.value.trim()) return;
    try {
      const { header, payload } = decodeJwt(tokenIn.value);
      headerOut.textContent = JSON.stringify(header, null, 2);
      payloadOut.textContent = JSON.stringify(payload, null, 2);
      for (const claim of CLAIM_DATES) {
        if (typeof payload[claim] === "number") {
          claimsOut.append(el("div", {
            class: "font-mono text-slate-500 dark:text-slate-400",
            text: `${claim}: ${new Date(payload[claim] * 1000).toLocaleString()} (${new Date(payload[claim] * 1000).toISOString()})`,
          }));
        }
      }
      if (typeof payload.exp === "number") {
        setBadge(expBadge, payload.exp * 1000 > Date.now(), "not expired", "EXPIRED");
      }
    } catch (err) {
      headerOut.textContent = `⚠ ${err.message}`;
    }
  }
  on(tokenIn, "input", debounce(renderDecode, 300), signal);
  on(verifyBtn, "click", async () => {
    try {
      const ok = await verifyJwt(tokenIn.value, verifyKeyIn.value);
      setBadge(verifyBadge, ok, "Signature VALID ✓", "Signature INVALID ✗");
    } catch (err) { toast(err.message, "error"); }
  }, signal);

  // ---------- Sign pane ----------
  const headerIn = area({ rows: "4" });
  headerIn.value = saved.signHeader ?? '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
  const payloadIn = area({ rows: "6" });
  payloadIn.value = saved.signPayload ?? '{\n  "sub": "1234567890",\n  "name": "John Doe"\n}';
  const signKeyIn = area({ rows: "4", placeholder: "Secret (HS*) or PRIVATE KEY PEM (RS256/ES256) — never saved" });
  const tokenOut = pre();
  const copyTokenBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-slate-700 hover:bg-slate-800", text: "Copy token", type: "button" });
  const keygenBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-emerald-600 hover:bg-emerald-700", text: "Generate example RS256 key pair", type: "button" });
  const pubKeyOut = pre();

  const renderSign = debounce(async () => {
    storage.save({ ...storage.load(), signHeader: headerIn.value, signPayload: payloadIn.value });
    if (!signKeyIn.value.trim()) { tokenOut.textContent = "(enter a key to sign)"; return; }
    try {
      const token = await signJwt(JSON.parse(headerIn.value), JSON.parse(payloadIn.value), signKeyIn.value);
      tokenOut.textContent = token;
    } catch (err) {
      tokenOut.textContent = `⚠ ${err.message}`;
    }
  }, 400);
  for (const input of [headerIn, payloadIn, signKeyIn]) on(input, "input", renderSign, signal);
  on(copyTokenBtn, "click", () => copyText(tokenOut.textContent), signal);
  on(keygenBtn, "click", async () => {
    keygenBtn.disabled = true;
    try {
      const { privatePem, publicPem } = await generateRsaKeyPair();
      signKeyIn.value = privatePem;
      pubKeyOut.textContent = publicPem;
      headerIn.value = JSON.stringify({ ...JSON.parse(headerIn.value), alg: "RS256" }, null, 2);
      renderSign();
      toast("RS256 key pair generated (in memory only)", "success");
    } catch (err) { toast(err.message, "error"); }
    keygenBtn.disabled = false;
  }, signal);

  // ---------- Tabs ----------
  const decodePane = el("div", {}, [
    field("Token", tokenIn),
    el("div", { class: "grid md:grid-cols-2 gap-4" }, [
      el("div", {}, [field("Header", headerOut)]),
      el("div", {}, [field("Payload", payloadOut), expBadge]),
    ]),
    claimsOut,
    el("div", { class: "mt-4" }, [field(`Key (${SUPPORTED_ALGS.join(" / ")})`, verifyKeyIn)]),
    el("div", { class: "flex items-center gap-3" }, [verifyBtn, verifyBadge]),
  ]);
  const signPane = el("div", { class: "hidden" }, [
    el("div", { class: "grid md:grid-cols-2 gap-4" }, [
      el("div", {}, [field("Header (JSON)", headerIn)]),
      el("div", {}, [field("Payload (JSON)", payloadIn)]),
    ]),
    field("Signing key", signKeyIn),
    field("Token", tokenOut),
    el("div", { class: "flex flex-wrap gap-3" }, [copyTokenBtn, keygenBtn]),
    field("Generated public key (for the verify tab)", pubKeyOut),
  ]);

  const TAB_ACTIVE = "px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 border-violet-600 text-violet-700 dark:text-violet-300";
  const TAB_IDLE = "px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 border-transparent text-slate-400";
  const decodeTab = el("button", { class: TAB_ACTIVE, text: "Decode & Verify", type: "button" });
  const signTab = el("button", { class: TAB_IDLE, text: "Sign", type: "button" });
  const switchTo = (pane) => {
    decodePane.classList.toggle("hidden", pane !== "decode");
    signPane.classList.toggle("hidden", pane !== "sign");
    decodeTab.className = pane === "decode" ? TAB_ACTIVE : TAB_IDLE;
    signTab.className = pane === "sign" ? TAB_ACTIVE : TAB_IDLE;
  };
  on(decodeTab, "click", () => switchTo("decode"), signal);
  on(signTab, "click", () => switchTo("sign"), signal);

  container.append(
    el("div", { class: "flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4" }, [decodeTab, signTab]),
    decodePane, signPane,
  );
  renderDecode();
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8000/devtools/#/jwt`:
- **Sign tab:** type secret `test` → token appears live; edit payload → token re-signs. Copy works.
- Click "Generate example RS256 key pair" → private PEM fills the key field, public PEM shown, header alg switches to RS256, token re-signs.
- **Decode tab:** paste the signed token → header/payload panes render; add an `"exp"` in the sign payload (past epoch, e.g. `1600000000`) → decode shows EXPIRED badge and human dates.
- Paste the secret / public PEM in the verify field → "Signature VALID ✓"; change one character in the token payload → INVALID.
- **Security check:** in the console, `localStorage.getItem("devtools:jwt")` → contains `token`, `signHeader`, `signPayload` but NO key/secret material.
- Switch to another tool and back → no console errors; fields restore (except keys, by design).

- [ ] **Step 3: Commit**

```bash
git add devtools/tools/jwt/tool.js
git commit -m "feat: JWT tool UI — decode/verify/sign tabs with RS256 keygen"
```

---

### Task 7: Base64 + URL codec tools

**Files:**
- Create: `devtools/tools/base64/lib.js`, `devtools/tools/base64/tool.js`
- Create: `devtools/tools/url-codec/lib.js`, `devtools/tools/url-codec/tool.js`
- Test: `devtools/tests/codecs.test.js`

**Interfaces:**
- base64 lib: `encodeBase64(text) -> string`, `decodeBase64(b64) -> string` (UTF-8 safe; decode throws on invalid input).
- url-codec lib: `encodeComponent(text)`, `encodeUri(text)`, `decodeText(text)` (throws on malformed `%` sequences).

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/codecs.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeBase64, decodeBase64 } from "../tools/base64/lib.js";
import { encodeComponent, encodeUri, decodeText } from "../tools/url-codec/lib.js";

test("base64 round-trips UTF-8 (emoji, accents)", () => {
  const s = "héllo 👋 世界";
  assert.equal(decodeBase64(encodeBase64(s)), s);
});

test("base64 decode rejects invalid input", () => {
  assert.throws(() => decodeBase64("not base64!!!"));
});

test("url component vs uri encoding", () => {
  assert.equal(encodeComponent("a&b=c d"), "a%26b%3Dc%20d");
  assert.equal(encodeUri("https://x.com/a b?q=1&r=2"), "https://x.com/a%20b?q=1&r=2");
  assert.equal(decodeText("a%26b%20c"), "a&b c");
});

test("url decode throws on malformed percent sequence", () => {
  assert.throws(() => decodeText("bad%2"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the libs**

```js
// devtools/tools/base64/lib.js — UTF-8-safe (plain btoa breaks on non-Latin1)
export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function decodeBase64(b64) {
  const bin = atob(b64.trim()); // throws InvalidCharacterError on bad input
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
```

```js
// devtools/tools/url-codec/lib.js
export const encodeComponent = (text) => encodeURIComponent(text);
export const encodeUri = (text) => encodeURI(text);
export const decodeText = (text) => decodeURIComponent(text); // throws URIError on malformed input
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test devtools/tests/`
Expected: PASS

- [ ] **Step 5: Write the two tool UIs**

```js
// devtools/tools/base64/tool.js
import { encodeBase64, decodeBase64 } from "./lib.js";

export function render(container, ctx) {
  const { el, on, debounce, storage, toast, copyText, signal } = ctx;

  const input = el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    rows: "8", spellcheck: "false", placeholder: "Text or Base64…",
  });
  const output = el("pre", { class: "tool-output rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 min-h-[6rem]" });

  const act = (fn) => () => {
    try { output.textContent = fn(input.value); }
    catch (err) { toast(`Invalid input: ${err.message}`, "error"); }
  };
  const btn = (label, cls, handler) => {
    const b = el("button", { class: `py-2 px-4 rounded-md text-sm text-white ${cls}`, text: label, type: "button" });
    on(b, "click", handler, signal);
    return b;
  };

  on(input, "input", debounce(() => storage.save({ input: input.value }), 500), signal);
  input.value = storage.load()?.input ?? "";

  container.append(
    input,
    el("div", { class: "flex flex-wrap gap-3 my-4" }, [
      btn("Encode →", "bg-violet-600 hover:bg-violet-700", act(encodeBase64)),
      btn("Decode →", "bg-cyan-600 hover:bg-cyan-700", act(decodeBase64)),
      btn("Copy result", "bg-slate-700 hover:bg-slate-800", () => copyText(output.textContent)),
      btn("Use result as input", "bg-slate-500 hover:bg-slate-600", () => {
        input.value = output.textContent; storage.save({ input: input.value });
      }),
    ]),
    output,
  );
}
```

```js
// devtools/tools/url-codec/tool.js
import { encodeComponent, encodeUri, decodeText } from "./lib.js";

export function render(container, ctx) {
  const { el, on, debounce, storage, toast, copyText, signal } = ctx;

  const input = el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    rows: "6", spellcheck: "false", placeholder: "URL or text…",
  });
  const output = el("pre", { class: "tool-output rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 min-h-[6rem]" });

  const act = (fn) => () => {
    try { output.textContent = fn(input.value); }
    catch (err) { toast(`Invalid input: ${err.message}`, "error"); }
  };
  const btn = (label, cls, handler) => {
    const b = el("button", { class: `py-2 px-4 rounded-md text-sm text-white ${cls}`, text: label, type: "button" });
    on(b, "click", handler, signal);
    return b;
  };

  on(input, "input", debounce(() => storage.save({ input: input.value }), 500), signal);
  input.value = storage.load()?.input ?? "";

  container.append(
    input,
    el("div", { class: "flex flex-wrap gap-3 my-4" }, [
      btn("Encode component", "bg-violet-600 hover:bg-violet-700", act(encodeComponent)),
      btn("Encode full URI", "bg-blue-600 hover:bg-blue-700", act(encodeUri)),
      btn("Decode", "bg-cyan-600 hover:bg-cyan-700", act(decodeText)),
      btn("Copy result", "bg-slate-700 hover:bg-slate-800", () => copyText(output.textContent)),
    ]),
    output,
  );
}
```

- [ ] **Step 6: Verify in browser**

- `#/base64`: encode `héllo 👋` → decodes back identically via "Use result as input" + Decode. Bad Base64 → error toast, no crash.
- `#/url-codec`: "Encode component" on `a&b=c` → `a%26b%3Dc`; "Decode" on `bad%2` → error toast.

- [ ] **Step 7: Commit**

```bash
git add devtools/tools/base64/ devtools/tools/url-codec/ devtools/tests/codecs.test.js
git commit -m "feat: base64 and url-codec tools"
```

---

### Task 8: UUID + Hash tools

**Files:**
- Create: `devtools/tools/uuid/tool.js` (no lib — `crypto.randomUUID()` needs no wrapper)
- Create: `devtools/tools/hash/lib.js`, `devtools/tools/hash/tool.js`
- Test: `devtools/tests/hash.test.js`

**Interfaces:**
- hash lib: `hashText(text, algo) -> Promise<string>` (hex, lowercase; `algo` ∈ `"SHA-1" | "SHA-256" | "SHA-512"`); `ALGOS` array export.

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/hash.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

const { hashText, ALGOS } = await import("../tools/hash/lib.js");

test("SHA-256 of 'abc' matches the known vector", async () => {
  assert.equal(
    await hashText("abc", "SHA-256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("exports the three supported algorithms", () => {
  assert.deepEqual(ALGOS, ["SHA-1", "SHA-256", "SHA-512"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — module not found

- [ ] **Step 3: Write hash lib + both tool UIs**

```js
// devtools/tools/hash/lib.js
export const ALGOS = ["SHA-1", "SHA-256", "SHA-512"];

export async function hashText(text, algo) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

```js
// devtools/tools/hash/tool.js
import { hashText, ALGOS } from "./lib.js";

export function render(container, ctx) {
  const { el, on, debounce, storage, copyText, signal } = ctx;

  const input = el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    rows: "6", spellcheck: "false", placeholder: "Text to hash…",
  });
  const rows = new Map(); // algo -> output cell
  const table = el("div", { class: "mt-4 space-y-2" }, ALGOS.map((algo) => {
    const out = el("code", { class: "tool-output flex-1 min-w-0", text: "—" });
    rows.set(algo, out);
    const copyBtn = el("button", { class: "text-xs text-violet-600 hover:underline shrink-0", text: "copy", type: "button" });
    on(copyBtn, "click", () => copyText(out.textContent), signal);
    return el("div", { class: "flex items-center gap-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3" }, [
      el("span", { class: "w-20 shrink-0 text-xs font-semibold text-slate-400", text: algo }),
      out, copyBtn,
    ]);
  }));

  const update = debounce(async () => {
    storage.save({ input: input.value });
    for (const [algo, out] of rows) {
      out.textContent = input.value ? await hashText(input.value, algo) : "—";
    }
  }, 300);
  on(input, "input", update, signal);

  input.value = storage.load()?.input ?? "";
  container.append(input, table);
  if (input.value) update();
}
```

```js
// devtools/tools/uuid/tool.js
export function render(container, ctx) {
  const { el, on, toast, copyText, signal } = ctx;

  const count = el("input", {
    type: "number", value: "1", min: "1", max: "100",
    class: "w-24 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-sm",
  });
  const out = el("pre", { class: "tool-output rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 min-h-[6rem] mt-4" });

  const genBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-violet-600 hover:bg-violet-700", text: "Generate", type: "button" });
  on(genBtn, "click", () => {
    const n = Math.min(100, Math.max(1, Number(count.value) || 1));
    if (typeof crypto.randomUUID !== "function") { toast("crypto.randomUUID requires a secure context (https or localhost)", "error"); return; }
    out.textContent = Array.from({ length: n }, () => crypto.randomUUID()).join("\n");
  }, signal);

  const copyBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-slate-700 hover:bg-slate-800", text: "Copy all", type: "button" });
  on(copyBtn, "click", () => copyText(out.textContent), signal);

  container.append(
    el("div", { class: "flex items-center gap-3" }, [
      el("span", { class: "text-sm", text: "Count:" }), count, genBtn, copyBtn,
    ]),
    out,
  );
  genBtn.click();
}
```

- [ ] **Step 4: Run tests, verify in browser**

Run: `node --test devtools/tests/` — Expected: PASS.
Browser: `#/hash` — type `abc`, the SHA-256 row shows `ba7816bf…015ad`; `#/uuid` — page opens with one UUID, count 5 + Generate gives 5 unique values, Copy all works.

- [ ] **Step 5: Commit**

```bash
git add devtools/tools/uuid/ devtools/tools/hash/ devtools/tests/hash.test.js
git commit -m "feat: uuid and hash generator tools"
```

---

### Task 9: Timestamp converter tool

**Files:**
- Create: `devtools/tools/timestamp/lib.js`, `devtools/tools/timestamp/tool.js`
- Test: `devtools/tests/timestamp.test.js`

**Interfaces:**
- lib: `parseTimestamp(input) -> { ms, unit }` (unit: `"seconds" | "milliseconds" | "date string"`; throws on garbage); `describe(ms, now?) -> { iso, utc, local, epochSeconds, epochMillis, relative }`; `relativeTime(ms, now) -> string`.

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/timestamp.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTimestamp, describe, relativeTime } from "../tools/timestamp/lib.js";

test("10-digit input treated as seconds, 13-digit as milliseconds", () => {
  assert.deepEqual(parseTimestamp("1700000000"), { ms: 1700000000000, unit: "seconds" });
  assert.deepEqual(parseTimestamp("1700000000000"), { ms: 1700000000000, unit: "milliseconds" });
});

test("date strings parse", () => {
  const r = parseTimestamp("2026-07-04T00:00:00Z");
  assert.equal(r.ms, Date.UTC(2026, 6, 4));
  assert.equal(r.unit, "date string");
});

test("garbage throws", () => {
  assert.throws(() => parseTimestamp("not a date"));
});

test("describe returns consistent fields", () => {
  const d = describe(1700000000000, 1700000000000);
  assert.equal(d.iso, "2023-11-14T22:13:20.000Z");
  assert.equal(d.epochSeconds, 1700000000);
  assert.equal(d.epochMillis, 1700000000000);
  assert.equal(d.relative, "now");
});

test("relativeTime describes past and future", () => {
  const now = 1700000000000;
  assert.equal(relativeTime(now - 3 * 3600e3, now), "3 hours ago");
  assert.equal(relativeTime(now + 2 * 864e5, now), "in 2 days");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — module not found

- [ ] **Step 3: Write `lib.js`**

```js
// devtools/tools/timestamp/lib.js
export function parseTimestamp(input) {
  const s = input.trim();
  if (/^-?\d+$/.test(s)) {
    const digits = s.replace("-", "").length;
    const n = Number(s);
    if (!Number.isSafeInteger(n)) throw new Error("Number too large");
    return digits >= 13 ? { ms: n, unit: "milliseconds" } : { ms: n * 1000, unit: "seconds" };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Not a recognizable epoch or date string");
  return { ms: d.getTime(), unit: "date string" };
}

const UNITS = [
  ["year", 31536e6], ["month", 2592e6], ["day", 864e5],
  ["hour", 36e5], ["minute", 6e4], ["second", 1e3],
];

export function relativeTime(ms, now = Date.now()) {
  const diff = ms - now;
  const abs = Math.abs(diff);
  for (const [unit, size] of UNITS) {
    if (abs >= size || unit === "second") {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(diff / size), unit);
    }
  }
}

export function describe(ms, now = Date.now()) {
  const d = new Date(ms);
  return {
    iso: d.toISOString(),
    utc: d.toUTCString(),
    local: d.toLocaleString(),
    epochSeconds: Math.floor(ms / 1000),
    epochMillis: ms,
    relative: relativeTime(ms, now),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test devtools/tests/`
Expected: PASS

- [ ] **Step 5: Write `tool.js`**

```js
// devtools/tools/timestamp/tool.js
import { parseTimestamp, describe } from "./lib.js";

const LABELS = {
  iso: "ISO 8601", utc: "UTC", local: "Local",
  epochSeconds: "Epoch (s)", epochMillis: "Epoch (ms)", relative: "Relative",
};

export function render(container, ctx) {
  const { el, on, every, debounce, storage, toast, copyText, signal } = ctx;

  const nowLine = el("div", { class: "font-mono text-sm text-slate-500 dark:text-slate-400" });
  const tick = () => {
    nowLine.textContent = `now: ${Math.floor(Date.now() / 1000)} s  |  ${Date.now()} ms  |  ${new Date().toISOString()}`;
  };
  tick();
  every(1000, tick, signal); // interval dies with the tool — no leak

  const input = el("input", {
    type: "text", placeholder: "1700000000, 1700000000000, or 2026-07-04T12:00:00Z",
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    autocomplete: "off",
  });
  const results = el("div", { class: "mt-4 space-y-2" });

  const update = debounce(() => {
    storage.save({ input: input.value });
    results.replaceChildren();
    if (!input.value.trim()) return;
    try {
      const { ms, unit } = parseTimestamp(input.value);
      const d = describe(ms);
      results.append(el("div", { class: "text-xs text-slate-400", text: `interpreted as ${unit}` }));
      for (const [key, label] of Object.entries(LABELS)) {
        const val = el("code", { class: "tool-output flex-1 min-w-0", text: String(d[key]) });
        const copyBtn = el("button", { class: "text-xs text-violet-600 hover:underline shrink-0", text: "copy", type: "button" });
        on(copyBtn, "click", () => copyText(val.textContent), signal);
        results.append(el("div", { class: "flex items-center gap-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3" }, [
          el("span", { class: "w-24 shrink-0 text-xs font-semibold text-slate-400", text: label }),
          val, copyBtn,
        ]));
      }
    } catch (err) {
      toast(err.message, "error");
    }
  }, 300);
  on(input, "input", update, signal);

  const nowBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-violet-600 hover:bg-violet-700", text: "Now", type: "button" });
  on(nowBtn, "click", () => { input.value = String(Math.floor(Date.now() / 1000)); update(); }, signal);

  input.value = storage.load()?.input ?? "";
  container.append(nowLine, el("div", { class: "flex gap-3 mt-3" }, [input, nowBtn]), results);
  if (input.value) update();
}
```

- [ ] **Step 6: Verify in browser**

`#/timestamp`: the "now" line ticks every second; entering `1700000000` shows all six rows (ISO `2023-11-14T22:13:20.000Z`); "Now" button fills current epoch; switching to another tool and back must NOT double the tick rate (interval cleanup working).

- [ ] **Step 7: Commit**

```bash
git add devtools/tools/timestamp/ devtools/tests/timestamp.test.js
git commit -m "feat: timestamp converter with live epoch clock"
```

---

### Task 10: Case converter + Query-string parser tools

**Files:**
- Create: `devtools/tools/case-converter/lib.js`, `devtools/tools/case-converter/tool.js`
- Create: `devtools/tools/query-string/lib.js`, `devtools/tools/query-string/tool.js`
- Test: `devtools/tests/text-tools.test.js`

**Interfaces:**
- case lib: `words(input) -> string[]`; `CONVERTERS` — ordered object `{ camelCase, PascalCase, snake_case, "kebab-case", "Title Case" }`, each a `(input) => string`.
- query lib: `parseQuery(input) -> Array<[key, value]>` (accepts full URLs, leading `?`, or bare query; strips `#fragment`; preserves duplicate keys); `entriesToJson(entries) -> object` (duplicate keys become arrays).

- [ ] **Step 1: Write the failing test**

```js
// devtools/tests/text-tools.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { words, CONVERTERS } from "../tools/case-converter/lib.js";
import { parseQuery, entriesToJson } from "../tools/query-string/lib.js";

test("words splits camel, snake, kebab and spaces", () => {
  assert.deepEqual(words("getUserByID"), ["get", "User", "By", "ID"]);
  assert.deepEqual(words("some_snake-and space"), ["some", "snake", "and", "space"]);
});

test("all converters produce their case", () => {
  const input = "hello world_example";
  assert.equal(CONVERTERS.camelCase(input), "helloWorldExample");
  assert.equal(CONVERTERS.PascalCase(input), "HelloWorldExample");
  assert.equal(CONVERTERS.snake_case(input), "hello_world_example");
  assert.equal(CONVERTERS["kebab-case"](input), "hello-world-example");
  assert.equal(CONVERTERS["Title Case"](input), "Hello World Example");
});

test("parseQuery handles full URLs, fragments and duplicates", () => {
  assert.deepEqual(
    parseQuery("https://x.com/p?a=1&a=2&b=hi%20there#frag"),
    [["a", "1"], ["a", "2"], ["b", "hi there"]]
  );
  assert.deepEqual(parseQuery("?x=1"), [["x", "1"]]);
  assert.deepEqual(parseQuery("x=1&y="), [["x", "1"], ["y", ""]]);
});

test("entriesToJson groups duplicate keys into arrays", () => {
  assert.deepEqual(
    entriesToJson([["a", "1"], ["a", "2"], ["b", "3"]]),
    { a: ["1", "2"], b: "3" }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test devtools/tests/`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the libs**

```js
// devtools/tools/case-converter/lib.js
export function words(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

const lower = (w) => w.toLowerCase();
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export const CONVERTERS = {
  camelCase: (s) => words(s).map((w, i) => (i === 0 ? lower(w) : cap(w))).join(""),
  PascalCase: (s) => words(s).map(cap).join(""),
  snake_case: (s) => words(s).map(lower).join("_"),
  "kebab-case": (s) => words(s).map(lower).join("-"),
  "Title Case": (s) => words(s).map(cap).join(" "),
};
```

```js
// devtools/tools/query-string/lib.js
export function parseQuery(input) {
  let qs = input.trim().replace(/#.*$/, "");
  const qIndex = qs.indexOf("?");
  if (qIndex !== -1) qs = qs.slice(qIndex + 1);
  return [...new URLSearchParams(qs).entries()];
}

export function entriesToJson(entries) {
  const out = {};
  for (const [k, v] of entries) {
    if (k in out) out[k] = [].concat(out[k], v);
    else out[k] = v;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test devtools/tests/`
Expected: PASS (full suite green)

- [ ] **Step 5: Write the two tool UIs**

```js
// devtools/tools/case-converter/tool.js
import { CONVERTERS } from "./lib.js";

export function render(container, ctx) {
  const { el, on, debounce, storage, copyText, signal } = ctx;

  const input = el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    rows: "4", spellcheck: "false", placeholder: "some_variable name or camelCaseText…",
  });
  const rows = new Map();
  const list = el("div", { class: "mt-4 space-y-2" }, Object.keys(CONVERTERS).map((name) => {
    const out = el("code", { class: "tool-output flex-1 min-w-0", text: "—" });
    rows.set(name, out);
    const copyBtn = el("button", { class: "text-xs text-violet-600 hover:underline shrink-0", text: "copy", type: "button" });
    on(copyBtn, "click", () => copyText(out.textContent), signal);
    return el("div", { class: "flex items-center gap-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3" }, [
      el("span", { class: "w-28 shrink-0 text-xs font-semibold text-slate-400", text: name }),
      out, copyBtn,
    ]);
  }));

  const update = debounce(() => {
    storage.save({ input: input.value });
    for (const [name, out] of rows) {
      out.textContent = input.value.trim() ? CONVERTERS[name](input.value) : "—";
    }
  }, 200);
  on(input, "input", update, signal);

  input.value = storage.load()?.input ?? "";
  container.append(input, list);
  if (input.value) update();
}
```

```js
// devtools/tools/query-string/tool.js
import { parseQuery, entriesToJson } from "./lib.js";

export function render(container, ctx) {
  const { el, on, debounce, storage, copyText, signal } = ctx;

  const input = el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    rows: "4", spellcheck: "false", placeholder: "https://example.com/path?a=1&b=hello%20world  (or just the query string)",
  });
  const tableWrap = el("div", { class: "mt-4 overflow-x-auto" });
  const jsonOut = el("pre", { class: "tool-output rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 mt-4 min-h-[3rem]" });
  const copyJson = el("button", { class: "mt-2 py-2 px-4 rounded-md text-sm text-white bg-slate-700 hover:bg-slate-800", text: "Copy JSON", type: "button" });
  on(copyJson, "click", () => copyText(jsonOut.textContent), signal);

  const update = debounce(() => {
    storage.save({ input: input.value });
    tableWrap.replaceChildren();
    jsonOut.textContent = "";
    if (!input.value.trim()) return;
    const entries = parseQuery(input.value);
    if (!entries.length) { jsonOut.textContent = "(no parameters found)"; return; }
    const table = el("table", { class: "w-full text-sm border-collapse" }, [
      el("thead", {}, el("tr", {}, [
        el("th", { class: "text-left p-2 border-b border-slate-300 dark:border-slate-600 text-xs uppercase text-slate-400", text: "Key" }),
        el("th", { class: "text-left p-2 border-b border-slate-300 dark:border-slate-600 text-xs uppercase text-slate-400", text: "Value (decoded)" }),
      ])),
      el("tbody", {}, entries.map(([k, v]) => el("tr", {}, [
        el("td", { class: "p-2 border-b border-slate-200 dark:border-slate-700 font-mono", text: k }),
        el("td", { class: "p-2 border-b border-slate-200 dark:border-slate-700 font-mono break-all", text: v }),
      ]))),
    ]);
    tableWrap.append(table);
    jsonOut.textContent = JSON.stringify(entriesToJson(entries), null, 2);
  }, 300);
  on(input, "input", update, signal);

  input.value = storage.load()?.input ?? "";
  container.append(input, tableWrap, jsonOut, copyJson);
  if (input.value) update();
}
```

- [ ] **Step 6: Verify in browser**

- `#/case-converter`: type `getUserByID` → five rows update live (`get_user_by_id`, etc.).
- `#/query-string`: paste `https://x.com/p?a=1&a=2&b=hi%20there#frag` → table shows 3 decoded rows, JSON groups `a` into `["1","2"]`.

- [ ] **Step 7: Commit**

```bash
git add devtools/tools/case-converter/ devtools/tools/query-string/ devtools/tests/text-tools.test.js
git commit -m "feat: case converter and query-string parser tools"
```

---

### Task 11: Site integration — CSP, launcher card, redirect, sitemap, CLAUDE.md

**Files:**
- Create: `devtools/.htaccess`
- Modify: `index.html` (repo root — replace the Smart Formatter card, the `<a href="./jsonValidator/index.html">` block at lines 41–45)
- Modify: `jsonValidator/index.html` (replace entirely with redirect)
- Delete: `jsonValidator/main.js`, `jsonValidator/style.css`, `jsonValidator/features/` (all 13 files)
- Modify: `sitemap.xml` (read it first; swap the jsonValidator entry)
- Modify: `CLAUDE.md` (apps table + conventions)

- [ ] **Step 1: Write `devtools/.htaccess`**

```apache
# Content-Security-Policy for the devtools app only.
# - script-src: self + Tailwind Play CDN + jsdelivr (js-yaml dynamic import)
# - style-src needs 'unsafe-inline' because the Tailwind Play CDN injects a <style> tag
<IfModule mod_headers.c>
  Header set Content-Security-Policy "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'"
  Header set Referrer-Policy "no-referrer"
</IfModule>
```

- [ ] **Step 2: Update the root launcher card**

In root `index.html`, replace the Smart Formatter card (the `<a href="./jsonValidator/index.html">` block) with:

```html
    <a href="./devtools/"
      class="bg-white rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all border border-slate-200 hover:border-violet-500 hover:bg-violet-50 p-6">
      <h2 class="text-xl font-semibold text-violet-700 mb-2">🛠️ DevTools</h2>
      <p class="text-sm text-slate-600">JSON, JWT, Base64, hashes, timestamps and more — all in your browser.</p>
    </a>
```

- [ ] **Step 3: Replace `jsonValidator/index.html` with a redirect and delete the old files**

New `jsonValidator/index.html` content (complete file):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=../devtools/#/json-formatter" />
  <title>Moved — DevTools</title>
</head>
<body>
  <p>This tool moved to <a href="../devtools/#/json-formatter">DevTools → JSON Formatter</a>.</p>
</body>
</html>
```

```bash
git rm -r jsonValidator/features jsonValidator/main.js jsonValidator/style.css
```

- [ ] **Step 4: Update `sitemap.xml`**

Read `sitemap.xml` first. Replace any `<loc>` containing `jsonValidator` with `https://app.saifurrehman.com/devtools/`. If no jsonValidator entry exists, add a `<url>` entry for `https://app.saifurrehman.com/devtools/` following the file's existing format.

- [ ] **Step 5: Update `CLAUDE.md`**

In the Apps table, replace the jsonValidator row with:

```markdown
| `devtools/` | Developer-tools suite (JSON, JWT, Base64, hash, timestamp…) | None — fully client-side |
```

Add to the Conventions section:

```markdown
- `devtools/`: SPA shell + hash routing; tools are lazy ES modules under `devtools/tools/<slug>/tool.js` exporting `render(container, ctx)`; pure logic in sibling `lib.js` tested via `node --test devtools/tests/`; all listeners bound with `ctx.signal`; user input rendered only via `textContent`/`el()` — never `innerHTML`; JWT keys never persisted
```

Update the "No tests, no linter, no CI configured" line in Build & Run to: `- No linter or CI. Tests (devtools only): node --test devtools/tests/`

- [ ] **Step 6: Verify in browser**

- `http://localhost:8000/` → DevTools card present, links to the suite.
- `http://localhost:8000/jsonValidator/` → redirects to the JSON formatter tool.
- All 9 tools reachable; `node --test devtools/tests/` still green.
- (CSP header can only be verified on the Apache host after deploy — python http.server ignores .htaccess. Note this limitation in the final report.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrate devtools into site, retire jsonValidator (redirect kept)"
```

---

### Task 12: Final verification sweep

**Files:** none created — this is the release gate.

- [ ] **Step 1: Full test suite**

Run: `node --test devtools/tests/`
Expected: all tests pass, 0 failures.

- [ ] **Step 2: Smoke checklist (browser, every tool)**

For each of the 9 tools: opens from sidebar; happy-path action works; malformed input produces an error toast (not a crash); input restores after page reload; dark mode renders legibly.

- [ ] **Step 3: Leak check**

Switch rapidly between all tools ~20 times, then check via DevTools Performance monitor: listener count and JS heap return to a stable baseline; the timestamp tool's clock must not tick faster after revisits (single interval).

- [ ] **Step 4: Security spot-checks**

- `localStorage.getItem("devtools:jwt")` contains no secret/PEM material.
- Paste `<img src=x onerror=alert(1)>` as input into JSON formatter, Base64, case converter, and query-string (as a value) → renders as literal text everywhere, no alert fires.
- `grep -rn "innerHTML" devtools/` → zero matches.
- `grep -rn "eval(" devtools/` and `grep -rn "new Function" devtools/` → zero matches.

- [ ] **Step 5: Report**

Report results honestly: what passed, what failed, anything skipped. Fix failures before declaring done. No commit needed unless fixes were made.
