import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

const { decodeJwt, signJwt, verifyJwt, generateRsaKeyPair, b64urlEncode, b64urlDecode } =
  await import("../tools/jwt/lib.js");

test("b64url round-trips arbitrary bytes", () => {
  const bytes = Uint8Array.from([0, 1, 250, 251, 252, 253, 254, 255]);
  assert.deepEqual(b64urlDecode(b64urlEncode(bytes)), bytes);
});

test("HS256 sign → decode → verify round-trip", async () => {
  const token = await signJwt({ alg: "HS256", typ: "JWT" }, { sub: "42", name: "saif" }, "top-secret");
  const { header, payload } = decodeJwt(token);
  assert.equal(header.alg, "HS256");
  assert.equal(payload.name, "saif");
  assert.equal(await verifyJwt(token, "top-secret"), true);
  assert.equal(await verifyJwt(token, "wrong-secret"), false);
});

test("tampered payload fails verification", async () => {
  const token = await signJwt({ alg: "HS256", typ: "JWT" }, { admin: false }, "s");
  const [h, , s] = token.split(".");
  const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ admin: true })));
  assert.equal(await verifyJwt(`${h}.${forged}.${s}`, "s"), false);
});

test("RS256: generated key pair signs and verifies", async () => {
  const { privatePem, publicPem } = await generateRsaKeyPair();
  assert.ok(privatePem.includes("BEGIN PRIVATE KEY"));
  const token = await signJwt({ alg: "RS256", typ: "JWT" }, { iss: "me" }, privatePem);
  assert.equal(await verifyJwt(token, publicPem), true);
});

test("decodeJwt rejects malformed tokens with a clear error", () => {
  assert.throws(() => decodeJwt("only.two"), /3 dot-separated parts/);
});

test("ES256 sign and verify round-trip", async () => {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const toPem = async (key, fmt, label) => {
    const bytes = new Uint8Array(await crypto.subtle.exportKey(fmt, key));
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
    return `-----BEGIN ${label}-----\n${btoa(bin).match(/.{1,64}/g).join("\n")}\n-----END ${label}-----`;
  };
  const privPem = await toPem(kp.privateKey, "pkcs8", "PRIVATE KEY");
  const pubPem = await toPem(kp.publicKey, "spki", "PUBLIC KEY");
  const token = await signJwt({ alg: "ES256", typ: "JWT" }, { sub: "es" }, privPem);
  assert.equal(await verifyJwt(token, pubPem), true);
});

test("rejects RS256 public key used as an HS256 secret (algorithm confusion)", async () => {
  const { publicPem } = await generateRsaKeyPair();
  // Signing an HS256 token with a PEM as the secret must be refused...
  await assert.rejects(() => signJwt({ alg: "HS256", typ: "JWT" }, { admin: true }, publicPem), /mismatch/);
  // ...and verifying any HS256 token against a PEM must be refused, not silently trusted.
  const legit = await signJwt({ alg: "HS256", typ: "JWT" }, { admin: false }, "realsecret");
  await assert.rejects(() => verifyJwt(legit, publicPem), /mismatch/);
});

test("rejects RS256 verification with a raw secret instead of a PEM", async () => {
  const { privatePem } = await generateRsaKeyPair();
  const token = await signJwt({ alg: "RS256", typ: "JWT" }, { iss: "me" }, privatePem);
  await assert.rejects(() => verifyJwt(token, "not-a-pem-secret"), /mismatch/);
});
