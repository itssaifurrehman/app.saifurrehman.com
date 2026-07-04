import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { debounce } from "../core/dom.js";
import { createStorage } from "../core/storage.js";

function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test("debounce collapses rapid calls into the last one", async () => {
  let calls = [];
  const fn = debounce((v) => calls.push(v), 20);
  fn(1); fn(2); fn(3);
  await sleep(60);
  assert.deepEqual(calls, [3]);
});

test("storage round-trips values under the namespaced key", () => {
  const backend = memoryBackend();
  const s = createStorage("demo", backend);
  s.save({ a: 1 });
  assert.deepEqual(s.load(), { a: 1 });
  assert.equal(backend.getItem("devtools:demo"), '{"a":1}');
  s.clear();
  assert.equal(s.load(), null);
});

test("storage returns null and self-heals on corrupt JSON", () => {
  const backend = memoryBackend();
  backend.setItem("devtools:demo", "{not json");
  const s = createStorage("demo", backend);
  assert.equal(s.load(), null);
  assert.equal(backend.getItem("devtools:demo"), null);
});
