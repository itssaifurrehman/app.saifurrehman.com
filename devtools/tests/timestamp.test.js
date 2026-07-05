// devtools/tests/timestamp.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTimestamp, describe, relativeTime } from "../tools/timestamp/lib.js";

test("10-digit input treated as seconds, 13-digit as milliseconds", () => {
  assert.deepEqual(parseTimestamp("1700000000"), { ms: 1700000000000, unit: "seconds" });
  assert.deepEqual(parseTimestamp("1700000000000"), { ms: 1700000000000, unit: "milliseconds" });
});

test("date strings parse", () => {
  const r = parseTimestamp("2026-07-04T00:00:00Z");
  assert.equal(r.ms, Date.UTC(2026, 6, 4));
  assert.equal(r.unit, "date string");
});

test("garbage throws", () => {
  assert.throws(() => parseTimestamp("not a date"));
});

test("describe returns consistent fields", () => {
  const d = describe(1700000000000, 1700000000000);
  assert.equal(d.iso, "2023-11-14T22:13:20.000Z");
  assert.equal(d.epochSeconds, 1700000000);
  assert.equal(d.epochMillis, 1700000000000);
  assert.equal(d.relative, "now");
});

test("relativeTime describes past and future", () => {
  const now = 1700000000000;
  assert.equal(relativeTime(now - 3 * 3600e3, now), "3 hours ago");
  assert.equal(relativeTime(now + 2 * 864e5, now), "in 2 days");
});
