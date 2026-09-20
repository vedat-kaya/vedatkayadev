import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { applySecurityHeaders } from "./security.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

function decodePath(urlPath) {
  try {
    return decodeURIComponent(urlPath);
  } catch {
    return null;
  }
}

export async function sendStatic(req, res, distDir) {
  applySecurityHeaders(res);

  const url = new URL(req.url || "/", "http://127.0.0.1");
  let pathname = decodePath(url.pathname);
  if (pathname === null || pathname.includes("\0")) {
    res.statusCode = 400;
    res.end();
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";

  const unsafe = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const target = resolve(join(distDir, unsafe));
  const rootReal = await realpath(distDir);

  if (!inside(distDir, target)) {
    res.statusCode = 403;
    res.end();
    return;
  }

  const ext = extname(target).toLowerCase();
  if (!MIME[ext]) {
    await sendNotFound(res, distDir);
    return;
  }

  let fileStat;
  let realTarget;
  try {
    realTarget = await realpath(target);
    fileStat = await stat(realTarget);
  } catch {
    await sendNotFound(res, distDir);
    return;
  }

  if (!inside(rootReal, realTarget) || !fileStat.isFile()) {
    res.statusCode = 403;
    res.end();
    return;
  }

  res.setHeader("Content-Type", MIME[ext]);
  if (ext === ".html") res.setHeader("Cache-Control", "no-cache");
  else if (ext === ".mp4" || ext === ".mp3") {
    res.setHeader("Cache-Control", "public, max-age=86400");
  } else res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  const size = fileStat.size;
  const range = req.headers.range;
  if (range && ext === ".mp4" && (req.method === "GET" || req.method === "HEAD")) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : size - 1;
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        start > end ||
        end >= size
      ) {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${size}`);
        res.end();
        return;
      }
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", String(end - start + 1));
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(realTarget, { start, end }).pipe(res);
      return;
    }
  }

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", String(size));
  res.statusCode = 200;
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(realTarget).pipe(res);
}

async function sendNotFound(res, distDir) {
  const fallback = join(distDir, "404.html");
  try {
    const real = await realpath(fallback);
    const info = await stat(real);
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Length", String(info.size));
    createReadStream(real).pipe(res);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  }
}
