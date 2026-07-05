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
