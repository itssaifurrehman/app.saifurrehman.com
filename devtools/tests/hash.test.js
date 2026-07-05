// devtools/tests/hash.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

const { hashText, ALGOS } = await import("../tools/hash/lib.js");

test("SHA-256 of 'abc' matches the known vector", async () => {
  assert.equal(
    await hashText("abc", "SHA-256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("exports the three supported algorithms", () => {
  assert.deepEqual(ALGOS, ["SHA-1", "SHA-256", "SHA-512"]);
});
