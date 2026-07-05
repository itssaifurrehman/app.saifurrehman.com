// devtools/tools/timestamp/lib.js
export function parseTimestamp(input) {
  const s = input.trim();
  if (/^-?\d+$/.test(s)) {
    const digits = s.replace("-", "").length;
    const n = Number(s);
    if (!Number.isSafeInteger(n)) throw new Error("Number too large");
    return digits >= 13 ? { ms: n, unit: "milliseconds" } : { ms: n * 1000, unit: "seconds" };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Not a recognizable epoch or date string");
  return { ms: d.getTime(), unit: "date string" };
}

const UNITS = [
  ["year", 31536e6], ["month", 2592e6], ["day", 864e5],
  ["hour", 36e5], ["minute", 6e4], ["second", 1e3],
];

export function relativeTime(ms, now = Date.now()) {
  const diff = ms - now;
  const abs = Math.abs(diff);
  for (const [unit, size] of UNITS) {
    if (abs >= size || unit === "second") {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(diff / size), unit);
    }
  }
}

export function describe(ms, now = Date.now()) {
  const d = new Date(ms);
  return {
    iso: d.toISOString(),
    utc: d.toUTCString(),
    local: d.toLocaleString(),
    epochSeconds: Math.floor(ms / 1000),
    epochMillis: ms,
    relative: relativeTime(ms, now),
  };
}
