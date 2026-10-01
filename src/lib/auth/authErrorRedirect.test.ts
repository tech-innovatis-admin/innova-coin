import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";
import { buildAuthErrorRedirect } from "./authErrorRedirect";

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

describe("buildAuthErrorRedirect", () => {
  it("redireciona para /auth/error?code= e expira somente a transacao OAuth", () => {
    const request = new NextRequest(
      "http://127.0.0.1:3007/auth/callback?code=x&state=y",
      {
        headers: {
          host: "127.0.0.1:3007",
          cookie: `${SESSION_COOKIE_NAME}=sessao; ${TRANSACTION_COOKIE}=txn`,
        },
      },
    );

    const response = buildAuthErrorRedirect(
      request,
      "http://127.0.0.1:3007",
      "state_mismatch",
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location");
    expect(location).toBe(
      "http://127.0.0.1:3007/auth/error?code=state_mismatch",
    );
    expect(location).not.toMatch(/sso_error/);
    expect(expiredCookieNames(response)).toEqual([TRANSACTION_COOKIE]);
  });

  it("usa Secure quando x-forwarded-proto e https", () => {
    const request = new NextRequest("http://127.0.0.1:3007/auth/callback", {
      headers: {
        host: "127.0.0.1:3007",
        "x-forwarded-proto": "https",
      },
    });

    const response = buildAuthErrorRedirect(
      request,
      "https://coin.example.test",
      "callback_failed",
    );

    const setCookie =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie().join("; ")
        : (response.headers.get("set-cookie") ?? "");
    expect(setCookie).toMatch(/Secure/i);
  });
});
