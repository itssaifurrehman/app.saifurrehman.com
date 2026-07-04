// devtools/tools/jwt/lib.js — JWT decode/verify/sign on pure WebCrypto.
// Works in browsers and Node (tests shim globalThis.crypto for Node < 19).
const te = new TextEncoder();
const td = new TextDecoder();

export const SUPPORTED_ALGS = ["HS256", "HS384", "HS512", "RS256", "ES256"];

const HASH = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512", RS256: "SHA-256", ES256: "SHA-256" };

export function b64urlEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str) {
  const rem = str.length % 4;
  if (rem === 1) throw new Error("Invalid base64url length");
  const pad = rem === 2 ? "==" : rem === 3 ? "=" : "";
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("A JWT must have 3 dot-separated parts (header.payload.signature)");
  let header, payload;
  try { header = JSON.parse(td.decode(b64urlDecode(parts[0]))); }
  catch { throw new Error("Header is not valid base64url-encoded JSON"); }
  try { payload = JSON.parse(td.decode(b64urlDecode(parts[1]))); }
  catch { throw new Error("Payload is not valid base64url-encoded JSON"); }
  return { header, payload, signature: parts[2], signingInput: `${parts[0]}.${parts[1]}` };
}

function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!b64) throw new Error("Empty or malformed PEM");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function algParams(alg) {
  if (alg.startsWith("HS")) return { name: "HMAC" };
  if (alg === "RS256") return { name: "RSASSA-PKCS1-v1_5" };
  if (alg === "ES256") return { name: "ECDSA", hash: "SHA-256" };
  throw new Error(`Unsupported algorithm: ${alg}. Supported: ${SUPPORTED_ALGS.join(", ")}`);
}

async function importKeyFor(alg, keyText, usage) {
  if (!SUPPORTED_ALGS.includes(alg)) {
    throw new Error(`Unsupported algorithm: ${alg}. Supported: ${SUPPORTED_ALGS.join(", ")}`);
  }
  const looksPem = /-----BEGIN [A-Z ]*KEY-----/.test(keyText);
  if (alg.startsWith("HS")) {
    if (looksPem) {
      throw new Error(`${alg} expects a raw secret string, but a PEM key was provided (algorithm/key-type mismatch)`);
    }
    return crypto.subtle.importKey("raw", te.encode(keyText), { name: "HMAC", hash: HASH[alg] }, false, [usage]);
  }
  // RS256 / ES256 require a PEM key
  if (!looksPem) {
    throw new Error(`${alg} expects a PEM-encoded key, but a raw secret was provided (algorithm/key-type mismatch)`);
  }
  const format = usage === "sign" ? "pkcs8" : "spki";
  const importParams = alg === "RS256"
    ? { name: "RSASSA-PKCS1-v1_5", hash: HASH[alg] }
    : { name: "ECDSA", namedCurve: "P-256" };
  return crypto.subtle.importKey(format, pemToBytes(keyText), importParams, false, [usage]);
}

export async function signJwt(header, payload, keyText) {
  const key = await importKeyFor(header.alg, keyText, "sign");
  const input = `${b64urlEncode(te.encode(JSON.stringify(header)))}.${b64urlEncode(te.encode(JSON.stringify(payload)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign(algParams(header.alg), key, te.encode(input)));
  return `${input}.${b64urlEncode(sig)}`;
}

export async function verifyJwt(token, keyText) {
  const { header, signature, signingInput } = decodeJwt(token);
  const key = await importKeyFor(header.alg, keyText, "verify");
  try {
    return await crypto.subtle.verify(algParams(header.alg), key, b64urlDecode(signature), te.encode(signingInput));
  } catch {
    return false; // malformed signature bytes → invalid, not a crash
  }
}

function toPem(bytes, label) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  const lines = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

export async function generateRsaKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]
  );
  return {
    privatePem: toPem(new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey)), "PRIVATE KEY"),
    publicPem: toPem(new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey)), "PUBLIC KEY"),
  };
}
