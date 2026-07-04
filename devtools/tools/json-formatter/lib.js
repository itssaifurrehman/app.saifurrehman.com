// devtools/tools/json-formatter/lib.js — pure logic, no DOM. YAML conversion
// lives in tool.js because it needs the lazily-loaded js-yaml CDN module.

export function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    let line = null, col = null;
    const m = /position (\d+)/.exec(err.message);
    if (m) {
      const before = text.slice(0, Number(m[1])).split("\n");
      line = before.length;
      col = before.at(-1).length + 1;
    }
    return { ok: false, error: { message: err.message, line, col } };
  }
}

export function formatJson(text) {
  return JSON.stringify(JSON.parse(text), null, 2);
}

export function minifyJson(text) {
  return JSON.stringify(JSON.parse(text));
}

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

const safeTag = (k) => {
  const t = String(k).replace(/[^A-Za-z0-9_.-]/g, "_");
  return /^[A-Za-z_]/.test(t) ? t : "_" + t;
};

export function jsonToXml(value, tag = "root", depth = 0) {
  const pad = "  ".repeat(depth);
  if (value === null || typeof value !== "object") {
    return `${pad}<${tag}>${escapeXml(value ?? "")}</${tag}>`;
  }
  const entries = Array.isArray(value)
    ? value.map((v) => jsonToXml(v, "item", depth + 1))
    : Object.entries(value).map(([k, v]) => jsonToXml(v, safeTag(k), depth + 1));
  if (!entries.length) return `${pad}<${tag}/>`;
  return `${pad}<${tag}>\n${entries.join("\n")}\n${pad}</${tag}>`;
}

export function stats(text) {
  return {
    bytes: new TextEncoder().encode(text).length,
    lines: text ? text.split("\n").length : 0,
    chars: text.length,
  };
}
