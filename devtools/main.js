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
