const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
    "Content-Security-Policy": CSP,
  };
}

export function applySecurityHeaders(res) {
  const headers = securityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.removeHeader("X-Powered-By");
}

export function allowedOrigins() {
  const extra = (process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    ...extra,
  ];
}

export function requestAllowed(req) {
  const allowed = allowedOrigins();
  const host = req.headers.host;
  if (host && !host.includes("/")) {
    allowed.push(`http://${host}`, `https://${host}`);
  }

  const origin = req.headers.origin;
  if (origin) return allowed.includes(origin);

  if (process.env.NODE_ENV !== "production") return true;

  const referer = req.headers.referer;
  if (!referer) return false;
  try {
    return allowed.includes(new URL(referer).origin);
  } catch {
    return false;
  }
}

export function clientIp(req) {
  const remote = req.socket?.remoteAddress || "";
  const normalized = remote.replace("::ffff:", "");
  if (process.env.TRUST_PROXY === "1") {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string") {
      const first = xff.split(",")[0].trim();
      if (/^[0-9a-fA-F.:]+$/.test(first) && first.length < 64) return first;
    }
  }
  return normalized || "unknown";
}
