import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  clearIntrospectionCache,
  setIntrospectionTimeoutMs,
} from "@/lib/auth/brokerIntrospection";
import {
  createSessionTokenFromTokenUser,
  SESSION_COOKIE_NAME,
  type SessionTokenUser,
} from "@/lib/sessionToken";
import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import {
  evaluateSession,
  guardRequest,
  isApiRequest,
  isClientNavigationRequest,
  renderUnavailableHtml,
} from "@/lib/auth/sessionGuard";
import {
  startMockBroker,
  TEST_AUTHZ_VERSION,
  TEST_JWT_SECRET,
  withBrokerEnv,
  type MockBroker,
} from "@/lib/auth/testBroker";

const BASE = "http://127.0.0.1:3007";

const TEST_USER: SessionTokenUser = {
  id: "42",
  platforms: ["innovacoin"],
  innovacoinRoles: ["admin"],
  mustChangePassword: false,
};

async function brokerSessionToken() {
  const token = await createSessionTokenFromTokenUser(TEST_USER, {
    sid: randomUUID(),
    sub: randomUUID(),
    authz_version: TEST_AUTHZ_VERSION,
  });
  return { token };
}

async function legacySessionToken() {
  const token = await createSessionTokenFromTokenUser(TEST_USER);
  return token;
}

type RequestOptions = {
  token?: string;
  cookie?: boolean;
  headers?: Record<string, string>;
};

function request(path: string, options: RequestOptions = {}): NextRequest {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token !== undefined) {
    if (options.cookie !== false) {
      headers.cookie = `${SESSION_COOKIE_NAME}=${options.token}`;
    } else {
      headers.authorization = `Bearer ${options.token}`;
    }
  }
  return new NextRequest(new URL(path, BASE), { headers });
}

function expiredCookieNames(response: Response): string[] {
  return response.headers
    .getSetCookie()
    .filter((cookie) => /Max-Age=0/i.test(cookie))
    .map((cookie) => cookie.split("=")[0] ?? "");
}

function brokerEnv() {
  return withBrokerEnv(brokerOrigin, { AUTH_SECRET: TEST_JWT_SECRET });
}

let brokerOrigin = "";

describe("validador unico de sessao", () => {
  let broker: MockBroker;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_JWT_SECRET;
    broker = await startMockBroker();
    brokerOrigin = broker.origin;
  });

  afterAll(async () => {
    await broker.close();
  });

  it("reconhece rotas de API e navegacao client-side", () => {
    expect(isApiRequest("/api/auth/me")).toBe(true);
    expect(isApiRequest("/api")).toBe(true);
    expect(isApiRequest("/apiario")).toBe(false);
    expect(isApiRequest("/admin")).toBe(false);
    expect(isClientNavigationRequest(request("/admin", { headers: { RSC: "1" } }))).toBe(true);
    expect(
      isClientNavigationRequest(
        request("/admin", { headers: { "Next-Router-Prefetch": "1" } }),
      ),
    ).toBe(true);
    expect(
      isClientNavigationRequest(request("/admin", { headers: { "Next-Action": "abc" } })),
    ).toBe(true);
    expect(isClientNavigationRequest(request("/admin"))).toBe(false);
  });

  it("sessao ativa segue em pagina e em API", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("active");
    try {
      const { token } = await brokerSessionToken();
      expect(await guardRequest(request("/admin", { token }))).toBeNull();
      expect(await guardRequest(request("/api/auth/me", { token }))).toBeNull();
    } finally {
      restore();
    }
  });

  it("token invalido ou adulterado e inactive sem introspeccao", async () => {
    const restore = brokerEnv();
    try {
      const before = broker.calls;
      const decision = await evaluateSession(request("/admin", { token: "not-a-jwt" }));
      expect(decision.state).toBe("inactive");
      expect(decision.hadCookie).toBe(true);
      expect(broker.calls).toBe(before);
    } finally {
      restore();
    }
  });

  it("sessao inativa em pagina expira cookies e redireciona para /auth/login", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const { token } = await brokerSessionToken();
      const response = await guardRequest(request("/admin", { token }));
      expect(response).not.toBeNull();
      expect(response!.status).toBe(303);
      const location = new URL(response!.headers.get("location")!);
      expect(location.pathname).toBe("/auth/login");
      expect(location.searchParams.get("returnTo")).toBe("/admin");
      expect(expiredCookieNames(response!).sort()).toEqual(
        [SESSION_COOKIE_NAME, TRANSACTION_COOKIE].sort(),
      );
    } finally {
      restore();
    }
  });

  it("sessao inativa em API responde 401 JSON e expira cookies", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const { token } = await brokerSessionToken();
      const response = await guardRequest(request("/api/auth/me", { token }));
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
      expect(await response!.json()).toEqual({ error: "session_inactive" });
      expect(response!.headers.get("cache-control")).toBe("no-store");
      expect(expiredCookieNames(response!).sort()).toEqual(
        [SESSION_COOKIE_NAME, TRANSACTION_COOKIE].sort(),
      );
    } finally {
      restore();
    }
  });

  it("broker indisponivel em pagina responde 503 HTML e preserva os cookies", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("server_error");
    try {
      const { token } = await brokerSessionToken();
      const response = await guardRequest(request("/admin", { token }));
      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);
      expect(response!.headers.get("content-type")).toMatch(/text\/html/);
      expect(response!.headers.get("retry-after")).toBe("30");
      expect(response!.headers.get("cache-control")).toBe("no-store");
      expect(response!.headers.getSetCookie()).toEqual([]);
      expect(await response!.text()).toMatch(/temporariamente indispon/i);
    } finally {
      restore();
    }
  });

  it("broker indisponivel em API responde 503 JSON e preserva os cookies", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("hang");
    setIntrospectionTimeoutMs(150);
    try {
      const { token } = await brokerSessionToken();
      const response = await guardRequest(request("/api/auth/me", { token }));
      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);
      expect(await response!.json()).toEqual({ error: "auth_unavailable" });
      expect(response!.headers.get("retry-after")).toBe("30");
      expect(response!.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("RSC com sessao inativa responde 401 text/plain, sem Location", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const { token } = await brokerSessionToken();
      const response = await guardRequest(
        request("/admin", { token, headers: { RSC: "1" } }),
      );
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
      expect(response!.headers.get("content-type")).toMatch(/text\/plain/);
      expect(response!.headers.get("location")).toBeNull();
      expect(expiredCookieNames(response!).sort()).toEqual(
        [SESSION_COOKIE_NAME, TRANSACTION_COOKIE].sort(),
      );
    } finally {
      restore();
    }
  });

  it("Next-Action com sessao inativa responde 401 text/plain, sem Location", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const { token } = await brokerSessionToken();
      const response = await guardRequest(
        request("/admin", { token, headers: { "Next-Action": "1" } }),
      );
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
      expect(response!.headers.get("location")).toBeNull();
    } finally {
      restore();
    }
  });

  it("token legado sem sid em modo broker e inactive, sem introspeccao", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("active");
    try {
      const before = broker.calls;
      const token = await legacySessionToken();
      const decision = await evaluateSession(request("/admin", { token }));
      expect(decision.state).toBe("inactive");
      expect(decision.hadCookie).toBe(true);
      expect(broker.calls).toBe(before);
    } finally {
      restore();
    }
  });

  it("sem token o estado e inactive e nao ha introspeccao", async () => {
    const restore = brokerEnv();
    try {
      const before = broker.calls;
      const decision = await evaluateSession(request("/admin"));
      expect(decision.state).toBe("inactive");
      expect(decision.hadCookie).toBe(false);
      expect(broker.calls).toBe(before);
    } finally {
      restore();
    }
  });

  it("sem cookie em pagina redireciona para login sem Set-Cookie", async () => {
    const restore = brokerEnv();
    try {
      const response = await guardRequest(request("/admin"));
      expect(response).not.toBeNull();
      expect(response!.status).toBe(303);
      const location = new URL(response!.headers.get("location")!);
      expect(location.pathname).toBe("/auth/login");
      expect(response!.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("sem cookie em API responde 401 JSON sem Set-Cookie", async () => {
    const restore = brokerEnv();
    try {
      const response = await guardRequest(request("/api/auth/me"));
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
      expect(await response!.json()).toEqual({ error: "session_inactive" });
      expect(response!.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("Bearer valido e aceito e inativo nao emite Set-Cookie", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("active");
    try {
      const { token } = await brokerSessionToken();
      expect(
        await guardRequest(request("/api/auth/me", { token, cookie: false })),
      ).toBeNull();

      broker.setBehaviour("inactive");
      clearIntrospectionCache();
      const inactive = await guardRequest(
        request("/api/auth/me", { token, cookie: false }),
      );
      expect(inactive).not.toBeNull();
      expect(inactive!.status).toBe(401);
      expect(inactive!.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("introspccao com corpo JSON null trata como indisponivel em pagina e API", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("null_body");
    try {
      const { token } = await brokerSessionToken();
      const page = await guardRequest(request("/admin", { token }));
      expect(page).not.toBeNull();
      expect(page!.status).toBe(503);
      expect(page!.headers.get("retry-after")).toBe("30");
      expect(page!.headers.getSetCookie()).toEqual([]);

      const api = await guardRequest(request("/api/auth/me", { token }));
      expect(api).not.toBeNull();
      expect(api!.status).toBe(503);
      expect(await api!.json()).toEqual({ error: "auth_unavailable" });
      expect(api!.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("fetcher que lanca TypeError sincrono trata como indisponivel em pagina e API", async () => {
    const restore = brokerEnv();
    const failingFetcher = (() => {
      throw new TypeError("injected_sync_failure");
    }) as typeof fetch;
    try {
      const { token } = await brokerSessionToken();
      const page = await guardRequest(request("/admin", { token }), failingFetcher);
      expect(page).not.toBeNull();
      expect(page!.status).toBe(503);
      expect(page!.headers.getSetCookie()).toEqual([]);

      const api = await guardRequest(request("/api/auth/me", { token }), failingFetcher);
      expect(api).not.toBeNull();
      expect(api!.status).toBe(503);
      expect(await api!.json()).toEqual({ error: "auth_unavailable" });
      expect(api!.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("modo legacy com token valido e active sem introspeccao", async () => {
    const previous = { ...process.env };
    process.env.AUTH_MODE = "legacy";
    process.env.AUTH_SECRET = TEST_JWT_SECRET;
    try {
      const before = broker.calls;
      const token = await legacySessionToken();
      const decision = await evaluateSession(request("/admin", { token }));
      expect(decision.state).toBe("active");
      expect(broker.calls).toBe(before);
    } finally {
      process.env = previous;
    }
  });

  it("a pagina de indisponibilidade nao vaza dados da requisicao", () => {
    const html = renderUnavailableHtml();
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toMatch(/lang="pt-BR"/);
    expect(/innova_session|sid|token/i.test(html)).toBe(false);
  });
});
