const PREFIX = "devtools:";

export function createStorage(slug, backend = globalThis.localStorage) {
  const key = PREFIX + slug;
  return {
    load() {
      try {
        const raw = backend.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch {
        try { backend.removeItem(key); } catch { /* quota/security: ignore */ }
        return null;
      }
    },
    save(value) {
      try { backend.setItem(key, JSON.stringify(value)); } catch { /* quota: ignore */ }
    },
    clear() {
      try { backend.removeItem(key); } catch { /* ignore */ }
    },
  };
}
