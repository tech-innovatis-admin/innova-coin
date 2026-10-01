import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import {
  CentralOidcConfigError,
  encryptTransaction,
  resetOidcConfigurationCache,
} from "@/lib/auth/centralOidc";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";
import { withBrokerEnv } from "@/lib/auth/testBroker";
import { GET } from "./route";

const restores: Array<() => void> = [];

vi.mock("@/lib/auth/centralOidc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/centralOidc")>();
  return {
    ...actual,
    exchangeCentralCallback: vi.fn(),
  };
});

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getUserSnapshotById: vi.fn(),
    setSessionCookie: vi.fn(),
  };
});

import { exchangeCentralCallback } from "@/lib/auth/centralOidc";

afterEach(() => {
  vi.mocked(exchangeCentralCallback).mockReset();
  resetOidcConfigurationCache();
  while (restores.length > 0) {
    restores.pop()?.();
  }
});

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

function callbackRequest(
  search: string,
  transactionValue?: string,
): NextRequest {
  const cookieParts = [`${SESSION_COOKIE_NAME}=sessao-ativa`];
  if (transactionValue) {
    cookieParts.push(`${TRANSACTION_COOKIE}=${transactionValue}`);
  }
  return new NextRequest(`http://127.0.0.1:3007/auth/callback${search}`, {
    headers: {
      host: "127.0.0.1:3007",
      cookie: cookieParts.join("; "),
    },
  });
}

function expectAuthErrorRedirect(response: Response, code: string) {
  expect(response.status).toBeGreaterThanOrEqual(300);
  expect(response.status).toBeLessThan(400);
  const location = response.headers.get("location");
  expect(location).toBe(`http://127.0.0.1:3007/auth/error?code=${code}`);
  expect(location).not.toMatch(/sso_error|\/login\?/);
  expect(expiredCookieNames(response)).toEqual([TRANSACTION_COOKIE]);
}

describe("GET /auth/callback erros", () => {
  it("error do broker vira broker_denied em /auth/error", async () => {
    restores.push(withBrokerEnv("https://broker.example.test"));
    process.env.AUTH_SECRET = "test-bridge-secret-32-chars-min!!";

    const response = await GET(
      callbackRequest("?error=access_denied&error_description=ignored"),
    );
    expectAuthErrorRedirect(response, "broker_denied");
  });

  it("code ou state ausente vira missing_code", async () => {
    restores.push(withBrokerEnv("https://broker.example.test"));
    process.env.AUTH_SECRET = "test-bridge-secret-32-chars-min!!";

    const response = await GET(callbackRequest("?code=only-code"));
    expectAuthErrorRedirect(response, "missing_code");
  });

  it("cookie de transacao ausente vira missing_oauth_cookie", async () => {
    restores.push(withBrokerEnv("https://broker.example.test"));
    process.env.AUTH_SECRET = "test-bridge-secret-32-chars-min!!";

    const response = await GET(
      callbackRequest("?code=abc&state=xyz", undefined),
    );
    expectAuthErrorRedirect(response, "missing_oauth_cookie");
  });

  it("cookie invalido vira invalid_oauth_cookie", async () => {
    restores.push(withBrokerEnv("https://broker.example.test"));
    process.env.AUTH_SECRET = "test-bridge-secret-32-chars-min!!";

    const response = await GET(
      callbackRequest("?code=abc&state=xyz", "not-a-jwt"),
    );
    expectAuthErrorRedirect(response, "invalid_oauth_cookie");
  });

  it("state divergente vira state_mismatch", async () => {
    restores.push(withBrokerEnv("https://broker.example.test"));
    process.env.AUTH_SECRET = "test-bridge-secret-32-chars-min!!";

    const txn = await encryptTransaction({
      state: "expected-state",
      nonce: "nonce",
      code_verifier: "verifier",
    });

    const response = await GET(
      callbackRequest("?code=abc&state=wrong-state", txn),
    );
    expectAuthErrorRedirect(response, "state_mismatch");
  });

  it("falha no exchange vira callback_failed", async () => {
    restores.push(withBrokerEnv("https://broker.example.test"));
    process.env.AUTH_SECRET = "test-bridge-secret-32-chars-min!!";

    const state = "state-ok";
    const txn = await encryptTransaction({
      state,
      nonce: "nonce",
      code_verifier: "verifier",
    });

    vi.mocked(exchangeCentralCallback).mockRejectedValue(
      new CentralOidcConfigError("token exchange failed"),
    );

    const response = await GET(callbackRequest(`?code=abc&state=${state}`, txn));
    expectAuthErrorRedirect(response, "callback_failed");
    expect(vi.mocked(exchangeCentralCallback)).toHaveBeenCalled();
  });
});
