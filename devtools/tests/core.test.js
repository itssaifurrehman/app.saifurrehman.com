import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { debounce, every } from "../core/dom.js";
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

test("every never starts when the signal is already aborted", async () => {
  const ctrl = new AbortController();
  ctrl.abort();
  let ticks = 0;
  every(5, () => ticks++, ctrl.signal);
  await sleep(30);
  assert.equal(ticks, 0);
});

test("every stops ticking after abort", async () => {
  const ctrl = new AbortController();
  let ticks = 0;
  every(5, () => ticks++, ctrl.signal);
  await sleep(30);
  ctrl.abort();
  const at = ticks;
  assert.ok(at > 0);
  await sleep(30);
  assert.equal(ticks, at);
});
