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
