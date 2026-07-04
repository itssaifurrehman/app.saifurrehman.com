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
