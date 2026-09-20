import { mkdir, appendFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const inbox = join(dataDir, "inbox.jsonl");
const MAX_BYTES = 2 * 1024 * 1024;

export async function persistMessage(payload, meta) {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });

  try {
    const info = await stat(inbox);
    if (info.size > MAX_BYTES) {
      return { stored: false };
    }
  } catch {
    /* ilk yazım */
  }

  const line =
    JSON.stringify({
      at: new Date().toISOString(),
      ipHash: meta.ipHash,
      name: payload.name,
      email: payload.email,
      message: payload.message,
    }) + "\n";

  await appendFile(inbox, line, { encoding: "utf8", mode: 0o600 });
  return { stored: true };
}
