// devtools/tests/json-formatter.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJson, formatJson, minifyJson, jsonToXml, stats } from "../tools/json-formatter/lib.js";

test("parseJson reports line and column for invalid JSON", () => {
  const r = parseJson('{\n  "a": 1,\n  "b" 2\n}');
  assert.equal(r.ok, false);
  assert.equal(r.error.line, 3);
  assert.ok(r.error.message.length > 0);
});

test("formatJson pretty-prints with 2-space indent", () => {
  assert.equal(formatJson('{"a":[1,2]}'), '{\n  "a": [\n    1,\n    2\n  ]\n}');
});

test("minifyJson strips whitespace", () => {
  assert.equal(minifyJson('{ "a" : 1 }'), '{"a":1}');
});

test("jsonToXml escapes content and sanitizes tag names", () => {
  const xml = jsonToXml({ "bad key": "<hi>", n: [1] });
  assert.ok(xml.includes("<bad_key>&lt;hi&gt;</bad_key>"));
  assert.ok(xml.includes("<item>1</item>"));
  assert.ok(xml.startsWith("<root>"));
});

test("stats counts bytes, lines, chars", () => {
  assert.deepEqual(stats("ab\né"), { bytes: 5, lines: 2, chars: 4 });
});
