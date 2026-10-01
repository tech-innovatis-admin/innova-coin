import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { DEFAULT_HUB_HOME_URL } from "@/lib/auth/hubHome";
import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import { withBrokerEnv } from "@/lib/auth/testBroker";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";
import { GET } from "./route";

const restores: Array<() => void> = [];

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

function logoutRequest(): NextRequest {
  return new NextRequest(new URL("http://127.0.0.1:3007/auth/logout"), {
    headers: { host: "127.0.0.1:3007" },
  });
}

function expiredCookieNames(response: Response): string[] {
  const headers =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie")!]
        : [];
  return headers
    .filter((cookie) => /Max-Age=0/i.test(cookie))
    .map((cookie) => cookie.split("=")[0] ?? "")
    .sort();
}

describe("GET /auth/logout", () => {
  it("modo broker responde 303 para hubHomeUrl() e expira sessão e transação", async () => {
    restores.push(
      withBrokerEnv("https://broker.example.test", {
        HUB_HOME_URL: "https://hub.example.test/",
      }),
    );

    const response = await GET(logoutRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://hub.example.test/");
    expect(response.headers.get("location")).not.toMatch(/\/oidc\/logout/);
    expect(expiredCookieNames(response)).toEqual(
      [SESSION_COOKIE_NAME, TRANSACTION_COOKIE].sort(),
    );
  });

  it("HUB_HOME_URL inválido redireciona para o padrão do Hub", async () => {
    restores.push(
      withBrokerEnv("https://broker.example.test", {
        HUB_HOME_URL: "nao-e-url",
      }),
    );

    const response = await GET(logoutRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(DEFAULT_HUB_HOME_URL);
  });

  it("modo legacy redireciona para /login na origem da app", async () => {
    const previous = { ...process.env };
    restores.push(() => {
      process.env = previous;
    });
    process.env.AUTH_MODE = "legacy";
    delete process.env.CENTRAL_OIDC_CLIENT_SECRET;

    const response = await GET(logoutRequest());

    expect(response.headers.get("location")).toBe("http://127.0.0.1:3007/login");
    expect(expiredCookieNames(response)).toEqual(
      [SESSION_COOKIE_NAME, TRANSACTION_COOKIE].sort(),
    );
  });
});
