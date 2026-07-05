// devtools/tools/query-string/lib.js
export function parseQuery(input) {
  let qs = input.trim().replace(/#.*$/, "");
  const qIndex = qs.indexOf("?");
  if (qIndex !== -1) qs = qs.slice(qIndex + 1);
  return [...new URLSearchParams(qs).entries()];
}

export function entriesToJson(entries) {
  const out = {};
  for (const [k, v] of entries) {
    if (k in out) out[k] = [].concat(out[k], v);
    else out[k] = v;
  }
  return out;
}
