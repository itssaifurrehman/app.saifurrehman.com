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
