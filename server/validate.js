/**
 * İletişim gövdesi — tek doğruluk kaynağı.
 * Kullanıcı nesnesini asla yaymaz; prototip kirliliği reddedilir.
 */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL, "").trim().slice(0, max);
}

export function parseContactJson(raw) {
  if (typeof raw !== "string" && !Buffer.isBuffer(raw)) {
    return { ok: false, error: "invalid" };
  }
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : raw;
  if (text.length > 8192) return { ok: false, error: "invalid" };

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid" };
  }

  if (
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.getPrototypeOf(data) !== Object.prototype
  ) {
    return { ok: false, error: "invalid" };
  }

  if (
    Object.hasOwn(data, "__proto__") ||
    Object.hasOwn(data, "constructor") ||
    Object.hasOwn(data, "prototype")
  ) {
    return { ok: false, error: "invalid" };
  }

  return validateContact(data);
}

export function validateContact(data) {
  const company = clean(data.company, 200);
  if (company.length > 0) {
    return { ok: true, dropped: true };
  }

  const name = clean(data.name, 80);
  const email = clean(data.email, 254);
  const message = clean(data.message, 2000);
  const started = Number(data.t);

  if (name.length < 2 || name.length > 80) return { ok: false, error: "invalid" };
  if (!EMAIL.test(email) || email.length > 254) {
    return { ok: false, error: "invalid" };
  }
  if (message.length < 10 || message.length > 2000) {
    return { ok: false, error: "invalid" };
  }

  if (!Number.isFinite(started) || Date.now() - started < 1200) {
    return { ok: false, error: "invalid" };
  }
  if (Date.now() - started > 1000 * 60 * 60 * 6) {
    return { ok: false, error: "invalid" };
  }

  return {
    ok: true,
    dropped: false,
    payload: { name, email, message },
  };
}
