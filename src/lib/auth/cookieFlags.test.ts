import { afterEach, describe, expect, it } from "vitest";

import { resolveCookieSecure } from "@/lib/auth/cookieFlags";

const saved = {
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  NODE_ENV: process.env.NODE_ENV,
};

function setEnv(values: { AUTH_COOKIE_SECURE?: string; NODE_ENV?: string }) {
  const env = process.env as Record<string, string | undefined>;
  for (const key of ["AUTH_COOKIE_SECURE", "NODE_ENV"] as const) {
    if (values[key] === undefined) delete env[key];
    else env[key] = values[key];
  }
}

afterEach(() => setEnv(saved));

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("resolveCookieSecure", () => {
  it("AUTH_COOKIE_SECURE tem prioridade sobre o proxy e o NODE_ENV", () => {
    setEnv({ AUTH_COOKIE_SECURE: "false", NODE_ENV: "production" });
    expect(resolveCookieSecure(headers({ "x-forwarded-proto": "https" }))).toBe(false);
    setEnv({ AUTH_COOKIE_SECURE: "true", NODE_ENV: "development" });
    expect(resolveCookieSecure(headers({ "x-forwarded-proto": "http" }))).toBe(true);
  });

  it("x-forwarded-proto decide quando não há flag", () => {
    setEnv({ NODE_ENV: "production" });
    expect(resolveCookieSecure(headers({ "x-forwarded-proto": "http", host: "coin.example.test" }))).toBe(false);
    setEnv({ NODE_ENV: "development" });
    expect(resolveCookieSecure(headers({ "x-forwarded-proto": "https, http" }))).toBe(true);
  });

  it("sem flag nem proxy: produção com host público liga Secure; host local não", () => {
    setEnv({ NODE_ENV: "production" });
    expect(resolveCookieSecure(headers({ host: "coin.example.test" }))).toBe(true);
    expect(resolveCookieSecure(headers({ host: "127.0.0.1:3000" }))).toBe(false);
    expect(resolveCookieSecure(headers({ host: "192.168.0.10" }))).toBe(false);
    expect(resolveCookieSecure(headers({}))).toBe(false);
    setEnv({ NODE_ENV: "development" });
    expect(resolveCookieSecure(headers({ host: "coin.example.test" }))).toBe(false);
  });
});
