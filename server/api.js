import { handleContact } from "./contact.js";
import {
  applySecurityHeaders,
  clientIp,
  requestAllowed,
} from "./security.js";

const JSON_TYPE = "application/json";
const BODY_LIMIT = 8192;

function sendJson(res, status, body, extra = {}) {
  applySecurityHeaders(res);
  if (extra.retryAfter) res.setHeader("Retry-After", String(extra.retryAfter));
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.off("data", onData);
        reject(Object.assign(new Error("too_large"), { code: "too_large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    };
    req.on("data", onData);
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function apiPath(req) {
  const raw = req.url || "/";
  const q = raw.indexOf("?");
  return q === -1 ? raw : raw.slice(0, q);
}

/**
 * API isteğini işler. true = yanıt yazıldı, false = API değil.
 */
export async function handleApi(req, res) {
  const path = apiPath(req);
  if (!path.startsWith("/api")) return false;

  applySecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.end();
    return true;
  }

  if (path === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (path === "/api/contact" && req.method === "POST") {
    if (!requestAllowed(req)) {
      sendJson(res, 403, { ok: false, error: "invalid" });
      return true;
    }

    const type = String(req.headers["content-type"] || "");
    if (!type.toLowerCase().startsWith(JSON_TYPE)) {
      sendJson(res, 415, { ok: false, error: "invalid" });
      return true;
    }

    let raw;
    try {
      raw = await readBody(req, BODY_LIMIT);
    } catch (err) {
      const status = err.code === "too_large" ? 413 : 400;
      sendJson(res, status, { ok: false, error: "invalid" });
      return true;
    }

    const result = await handleContact(raw, clientIp(req));
    sendJson(res, result.status, result.body, {
      retryAfter: result.retryAfter,
    });
    return true;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
  return true;
}
