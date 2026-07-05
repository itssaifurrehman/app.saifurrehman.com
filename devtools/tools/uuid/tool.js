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
