const WINDOW_MS = 15 * 60 * 1000;
const MAX_HITS = 5;
const MAX_KEYS = 4000;

const hits = new Map();

function prune(now) {
  if (hits.size < MAX_KEYS) {
    for (const [key, entry] of hits) {
      if (now - entry.start > WINDOW_MS) hits.delete(key);
    }
    return;
  }
  hits.clear();
}

export function rateLimit(ip) {
  const now = Date.now();
  const key = typeof ip === "string" && ip.length > 0 && ip.length < 64 ? ip : "unknown";
  prune(now);

  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_HITS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.start)) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimitForTests() {
  hits.clear();
}
