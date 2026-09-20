import { createHash } from "node:crypto";
import { persistMessage } from "./store.js";
import { rateLimit } from "./rateLimit.js";
import { parseContactJson } from "./validate.js";

function hashIp(ip) {
  return createHash("sha256")
    .update(String(ip || "unknown"))
    .digest("hex")
    .slice(0, 16);
}

export async function handleContact(rawBody, ip) {
  const limited = rateLimit(ip);
  if (!limited.allowed) {
    return {
      status: 429,
      body: { ok: false, error: "busy" },
      retryAfter: limited.retryAfter,
    };
  }

  const parsed = parseContactJson(rawBody);
  if (!parsed.ok) {
    return { status: 400, body: { ok: false, error: "invalid" } };
  }

  if (parsed.dropped) {
    return { status: 200, body: { ok: true } };
  }

  try {
    const saved = await persistMessage(parsed.payload, { ipHash: hashIp(ip) });
    if (!saved.stored) {
      return { status: 503, body: { ok: false, error: "unavailable" } };
    }
  } catch {
    return { status: 503, body: { ok: false, error: "unavailable" } };
  }

  return { status: 200, body: { ok: true } };
}
