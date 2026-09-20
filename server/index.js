import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api.js";
import { sendStatic } from "./static.js";
import { applySecurityHeaders } from "./security.js";

const root = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(root, "..", "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 8787;

const server = createServer(async (req, res) => {
  try {
    if (await handleApi(req, res)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      applySecurityHeaders(res);
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.end();
      return;
    }
    await sendStatic(req, res, distDir);
  } catch {
    if (!res.headersSent) {
      applySecurityHeaders(res);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "unavailable" }));
    }
  }
});

server.listen(port, host, () => {
  process.stdout.write(`listening ${host}:${port}\n`);
});
