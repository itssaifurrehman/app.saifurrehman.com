// devtools/tools/base64/lib.js — UTF-8-safe (plain btoa breaks on non-Latin1)
export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function decodeBase64(b64) {
  const bin = atob(b64.trim()); // throws InvalidCharacterError on bad input
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
