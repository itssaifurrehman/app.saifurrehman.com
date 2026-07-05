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
