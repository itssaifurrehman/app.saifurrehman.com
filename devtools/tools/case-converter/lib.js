// devtools/tools/case-converter/lib.js
export function words(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

const lower = (w) => w.toLowerCase();
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export const CONVERTERS = {
  camelCase: (s) => words(s).map((w, i) => (i === 0 ? lower(w) : cap(w))).join(""),
  PascalCase: (s) => words(s).map(cap).join(""),
  snake_case: (s) => words(s).map(lower).join("_"),
  "kebab-case": (s) => words(s).map(lower).join("-"),
  "Title Case": (s) => words(s).map(cap).join(" "),
};
