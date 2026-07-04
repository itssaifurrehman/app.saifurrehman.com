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
