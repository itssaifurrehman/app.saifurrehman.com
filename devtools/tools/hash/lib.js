// devtools/tools/hash/lib.js
export const ALGOS = ["SHA-1", "SHA-256", "SHA-512"];

export async function hashText(text, algo) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
