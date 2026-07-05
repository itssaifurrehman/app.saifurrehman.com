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
