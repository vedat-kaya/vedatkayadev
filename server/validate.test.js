import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseContactJson } from "./validate.js";
import { rateLimit, resetRateLimitForTests } from "./rateLimit.js";

describe("parseContactJson", () => {
  const valid = {
    name: "Vedat Kaya",
    email: "hello@example.com",
    message: "Merhaba, bir proje için yazıyorum.",
    company: "",
    t: Date.now() - 2000,
  };

  it("kabul eder", () => {
    const result = parseContactJson(JSON.stringify(valid));
    assert.equal(result.ok, true);
    assert.equal(result.dropped, false);
    assert.equal(result.payload.email, "hello@example.com");
  });

  it("honeypot sessizce düşürür", () => {
    const result = parseContactJson(
      JSON.stringify({ ...valid, company: "http://spam.test" }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.dropped, true);
  });

  it("hızlı gönderimi reddeder", () => {
    const result = parseContactJson(
      JSON.stringify({ ...valid, t: Date.now() }),
    );
    assert.equal(result.ok, false);
  });

  it("geçersiz e-postayı reddeder", () => {
    const result = parseContactJson(
      JSON.stringify({ ...valid, email: "not-an-email" }),
    );
    assert.equal(result.ok, false);
  });

  it("__proto__ anahtarını reddeder", () => {
    const t = Date.now() - 2000;
    const raw = `{"name":"Vedat Kaya","email":"hello@example.com","message":"Merhaba, bir proje için yazıyorum.","company":"","t":${t},"__proto__":{"admin":true}}`;
    const result = parseContactJson(raw);
    assert.equal(result.ok, false);
  });

  it("dizi gövdesini reddeder", () => {
    const result = parseContactJson("[]");
    assert.equal(result.ok, false);
  });
});

describe("rateLimit", () => {
  it("eşikten sonra reddeder", () => {
    resetRateLimitForTests();
    let last;
    for (let i = 0; i < 6; i += 1) last = rateLimit("10.0.0.1");
    assert.equal(last.allowed, false);
  });
});
