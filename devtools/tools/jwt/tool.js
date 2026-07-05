// devtools/tools/jwt/tool.js
import { decodeJwt, signJwt, verifyJwt, generateRsaKeyPair, SUPPORTED_ALGS } from "./lib.js";

const CLAIM_DATES = ["iat", "exp", "nbf"];

export function render(container, ctx) {
  const { el, on, debounce, storage, toast, copyText, signal } = ctx;
  const saved = storage.load() ?? {};

  const field = (labelText, node) =>
    el("label", { class: "block mb-3" }, [
      el("span", { class: "block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1", text: labelText }),
      node,
    ]);
  const area = (attrs) => el("textarea", {
    class: "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-400",
    spellcheck: "false", autocomplete: "off", ...attrs,
  });
  const pre = () => el("pre", { class: "tool-output rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 min-h-[3rem]" });
  const badge = () => el("span", { class: "hidden" });

  const setBadge = (b, ok, textOk, textBad) => {
    b.textContent = ok ? textOk : textBad;
    b.className = "inline-block px-2 py-0.5 rounded text-xs font-semibold " +
      (ok ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100");
  };

  // ---------- Decode & Verify pane ----------
  const tokenIn = area({ rows: "5", placeholder: "Paste a JWT (xxx.yyy.zzz)…" });
  tokenIn.value = saved.token ?? "";
  const headerOut = pre();
  const payloadOut = pre();
  const claimsOut = el("div", { class: "text-sm space-y-1" });
  const expBadge = badge();
  const verifyKeyIn = area({ rows: "4", placeholder: "Secret (HS*) or PUBLIC KEY PEM (RS256/ES256) — never saved" });
  const verifyBadge = badge();
  const verifyBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-violet-600 hover:bg-violet-700", text: "Verify signature", type: "button" });

  function renderDecode() {
    storage.save({ ...storage.load(), token: tokenIn.value });
    headerOut.textContent = payloadOut.textContent = "";
    claimsOut.replaceChildren();
    expBadge.className = "hidden";
    if (!tokenIn.value.trim()) return;
    try {
      const { header, payload } = decodeJwt(tokenIn.value);
      headerOut.textContent = JSON.stringify(header, null, 2);
      payloadOut.textContent = JSON.stringify(payload, null, 2);
      for (const claim of CLAIM_DATES) {
        if (typeof payload[claim] === "number") {
          claimsOut.append(el("div", {
            class: "font-mono text-slate-500 dark:text-slate-400",
            text: `${claim}: ${new Date(payload[claim] * 1000).toLocaleString()} (${new Date(payload[claim] * 1000).toISOString()})`,
          }));
        }
      }
      if (typeof payload.exp === "number") {
        setBadge(expBadge, payload.exp * 1000 > Date.now(), "not expired", "EXPIRED");
      }
    } catch (err) {
      headerOut.textContent = `⚠ ${err.message}`;
    }
  }
  on(tokenIn, "input", debounce(renderDecode, 300), signal);
  on(verifyBtn, "click", async () => {
    try {
      const ok = await verifyJwt(tokenIn.value, verifyKeyIn.value);
      setBadge(verifyBadge, ok, "Signature VALID ✓", "Signature INVALID ✗");
    } catch (err) { toast(err.message, "error"); }
  }, signal);

  // ---------- Sign pane ----------
  const headerIn = area({ rows: "4" });
  headerIn.value = saved.signHeader ?? '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
  const payloadIn = area({ rows: "6" });
  payloadIn.value = saved.signPayload ?? '{\n  "sub": "1234567890",\n  "name": "John Doe"\n}';
  const signKeyIn = area({ rows: "4", placeholder: "Secret (HS*) or PRIVATE KEY PEM (RS256/ES256) — never saved" });
  const tokenOut = pre();
  const copyTokenBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-slate-700 hover:bg-slate-800", text: "Copy token", type: "button" });
  const keygenBtn = el("button", { class: "py-2 px-4 rounded-md text-sm text-white bg-emerald-600 hover:bg-emerald-700", text: "Generate example RS256 key pair", type: "button" });
  const pubKeyOut = pre();

  const renderSign = debounce(async () => {
    storage.save({ ...storage.load(), signHeader: headerIn.value, signPayload: payloadIn.value });
    if (!signKeyIn.value.trim()) { tokenOut.textContent = "(enter a key to sign)"; return; }
    try {
      const token = await signJwt(JSON.parse(headerIn.value), JSON.parse(payloadIn.value), signKeyIn.value);
      tokenOut.textContent = token;
    } catch (err) {
      tokenOut.textContent = `⚠ ${err.message}`;
    }
  }, 400);
  for (const input of [headerIn, payloadIn, signKeyIn]) on(input, "input", renderSign, signal);
  on(copyTokenBtn, "click", () => copyText(tokenOut.textContent), signal);
  on(keygenBtn, "click", async () => {
    keygenBtn.disabled = true;
    try {
      const { privatePem, publicPem } = await generateRsaKeyPair();
      signKeyIn.value = privatePem;
      pubKeyOut.textContent = publicPem;
      headerIn.value = JSON.stringify({ ...JSON.parse(headerIn.value), alg: "RS256" }, null, 2);
      renderSign();
      toast("RS256 key pair generated (in memory only)", "success");
    } catch (err) { toast(err.message, "error"); }
    keygenBtn.disabled = false;
  }, signal);

  // ---------- Tabs ----------
  const decodePane = el("div", {}, [
    field("Token", tokenIn),
    el("div", { class: "grid md:grid-cols-2 gap-4" }, [
      el("div", {}, [field("Header", headerOut)]),
      el("div", {}, [field("Payload", payloadOut), expBadge]),
    ]),
    claimsOut,
    el("div", { class: "mt-4" }, [field(`Key (${SUPPORTED_ALGS.join(" / ")})`, verifyKeyIn)]),
    el("div", { class: "flex items-center gap-3" }, [verifyBtn, verifyBadge]),
  ]);
  const signPane = el("div", { class: "hidden" }, [
    el("div", { class: "grid md:grid-cols-2 gap-4" }, [
      el("div", {}, [field("Header (JSON)", headerIn)]),
      el("div", {}, [field("Payload (JSON)", payloadIn)]),
    ]),
    field("Signing key", signKeyIn),
    field("Token", tokenOut),
    el("div", { class: "flex flex-wrap gap-3" }, [copyTokenBtn, keygenBtn]),
    field("Generated public key (for the verify tab)", pubKeyOut),
  ]);

  const TAB_ACTIVE = "px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 border-violet-600 text-violet-700 dark:text-violet-300";
  const TAB_IDLE = "px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 border-transparent text-slate-400";
  const decodeTab = el("button", { class: TAB_ACTIVE, text: "Decode & Verify", type: "button" });
  const signTab = el("button", { class: TAB_IDLE, text: "Sign", type: "button" });
  const switchTo = (pane) => {
    decodePane.classList.toggle("hidden", pane !== "decode");
    signPane.classList.toggle("hidden", pane !== "sign");
    decodeTab.className = pane === "decode" ? TAB_ACTIVE : TAB_IDLE;
    signTab.className = pane === "sign" ? TAB_ACTIVE : TAB_IDLE;
  };
  on(decodeTab, "click", () => switchTo("decode"), signal);
  on(signTab, "click", () => switchTo("sign"), signal);

  container.append(
    el("div", { class: "flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4" }, [decodeTab, signTab]),
    decodePane, signPane,
  );
  renderDecode();
}
