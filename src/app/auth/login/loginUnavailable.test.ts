import { createServer, type Server, type ServerResponse } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import { resetOidcConfigurationCache } from "@/lib/auth/centralOidc";
import {
  renderUnavailableHtml,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "@/lib/auth/sessionGuard";
import { TEST_CLIENT_SECRET, TEST_JWT_SECRET } from "@/lib/auth/testBroker";
import { GET } from "./route";

const BASE = "http://127.0.0.1:3007";

describe("GET /auth/login com broker fora do ar", () => {
  let hangingServer: Server;
  let hangingOrigin: string;
  const hangingResponses = new Set<ServerResponse>();
  const previousEnv = { ...process.env };

  beforeAll(async () => {
    hangingServer = createServer((_req, res) => {
      hangingResponses.add(res);
    });
    await new Promise<void>((resolve) =>
      hangingServer.listen(0, "127.0.0.1", () => resolve()),
    );
    const address = hangingServer.address();
    if (!address || typeof address === "string") {
      throw new Error("hanging server failed to bind");
    }
    hangingOrigin = `http://127.0.0.1:${address.port}`;

    Object.assign(process.env, {
      AUTH_MODE: "broker",
      AUTH_SECRET: TEST_JWT_SECRET,
      CENTRAL_OIDC_ISSUER: hangingOrigin,
      CENTRAL_OIDC_CLIENT_ID: "innova-coin",
      CENTRAL_OIDC_CLIENT_SECRET: TEST_CLIENT_SECRET,
      CENTRAL_OIDC_REDIRECT_URI: `${BASE}/auth/callback`,
      APP_URL: BASE,
    });
    resetOidcConfigurationCache();
  });

  afterAll(async () => {
    for (const res of hangingResponses) {
      res.destroy();
    }
    await new Promise<void>((resolve) => hangingServer.close(() => resolve()));
    process.env = previousEnv;
    resetOidcConfigurationCache();
  });

  function transactionSetCookies(response: Response): string[] {
    const headers =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")!]
          : [];
    return headers.filter((cookie) => cookie.startsWith(`${TRANSACTION_COOKIE}=`));
  }

  it(
    "descoberta travada responde 503 com Retry-After em menos de 4,5 s, sem cookie de transação",
    async () => {
      resetOidcConfigurationCache();
      const started = Date.now();
      const response = await GET(new NextRequest(`${BASE}/auth/login`));
      const elapsed = Date.now() - started;

      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe(String(UNAVAILABLE_RETRY_AFTER_SECONDS));
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toMatch(/text\/html/);
      expect(await response.text()).toBe(renderUnavailableHtml());
      expect(transactionSetCookies(response)).toEqual([]);
      expect(elapsed).toBeLessThan(4500);
    },
    10_000,
  );

  it("configuração ausente (bridge secret) continua 500 JSON", async () => {
    const oidcServer = createServer((req, res) => {
      const path = req.url ?? "";
      if (path.includes("/.well-known/openid-configuration")) {
        const issuer = process.env.CENTRAL_OIDC_ISSUER ?? "";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            issuer,
            authorization_endpoint: `${issuer}/oidc/auth`,
            token_endpoint: `${issuer}/oidc/token`,
            jwks_uri: `${issuer}/oidc/jwks`,
            response_types_supported: ["code"],
          }),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => oidcServer.listen(0, "127.0.0.1", () => resolve()));
    const address = oidcServer.address();
    if (!address || typeof address === "string") {
      throw new Error("oidc stub failed to bind");
    }
    const oidcOrigin = `http://127.0.0.1:${address.port}`;
    const previousIssuer = process.env.CENTRAL_OIDC_ISSUER;
    process.env.CENTRAL_OIDC_ISSUER = oidcOrigin;

    resetOidcConfigurationCache();
    const authSecret = process.env.AUTH_SECRET;
    const bridgeSecret = process.env.SSO_BRIDGE_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.SSO_BRIDGE_SECRET;
    try {
      const response = await GET(new NextRequest(`${BASE}/auth/login`));
      expect(response.status).toBe(500);
      expect(response.headers.get("content-type")).toMatch(/application\/json/);
      const body = (await response.json()) as { error?: string };
      expect(body.error).toMatch(/SSO_BRIDGE_SECRET|AUTH_SECRET/);
      expect(transactionSetCookies(response)).toEqual([]);
    } finally {
      process.env.AUTH_SECRET = authSecret;
      process.env.SSO_BRIDGE_SECRET = bridgeSecret;
      process.env.CENTRAL_OIDC_ISSUER = previousIssuer;
      resetOidcConfigurationCache();
      await new Promise<void>((resolve) => oidcServer.close(() => resolve()));
    }
  });
});
