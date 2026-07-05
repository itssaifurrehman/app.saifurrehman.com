// devtools/tests/codecs.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeBase64, decodeBase64 } from "../tools/base64/lib.js";
import { encodeComponent, encodeUri, decodeText } from "../tools/url-codec/lib.js";

test("base64 round-trips UTF-8 (emoji, accents)", () => {
  const s = "héllo 👋 世界";
  assert.equal(decodeBase64(encodeBase64(s)), s);
});

test("base64 decode rejects invalid input", () => {
  assert.throws(() => decodeBase64("not base64!!!"));
});

test("url component vs uri encoding", () => {
  assert.equal(encodeComponent("a&b=c d"), "a%26b%3Dc%20d");
  assert.equal(encodeUri("https://x.com/a b?q=1&r=2"), "https://x.com/a%20b?q=1&r=2");
  assert.equal(decodeText("a%26b%20c"), "a&b c");
});

test("url decode throws on malformed percent sequence", () => {
  assert.throws(() => decodeText("bad%2"));
});
