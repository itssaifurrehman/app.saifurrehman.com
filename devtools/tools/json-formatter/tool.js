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
