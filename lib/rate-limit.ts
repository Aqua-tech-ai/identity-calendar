type Entry = { count: number; expires: number };

const store = new Map<string, Entry>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.expires < now) {
    store.set(key, { count: 1, expires: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}
