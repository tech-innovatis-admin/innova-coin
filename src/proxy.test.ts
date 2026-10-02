import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { clearIntrospectionCache } from "@/lib/auth/brokerIntrospection";
import { SESSION_COOKIE_NAME, createSessionTokenFromTokenUser, type SessionTokenUser } from "@/lib/sessionToken";
import {
  startMockBroker,
  TEST_AUTHZ_VERSION,
  TEST_JWT_SECRET,
  withBrokerEnv,
  type MockBroker,
} from "@/lib/auth/testBroker";
import { config, isPublicProxyPath, proxy, PUBLIC_PROXY_PATHS } from "@/proxy";

const BASE = "http://127.0.0.1:3007";

const ADMIN_USER: SessionTokenUser = {
  id: "42",
  platforms: ["innovacoin"],
  innovacoinRoles: ["admin"],
  mustChangePassword: false,
};

async function brokerSessionToken(user: SessionTokenUser = ADMIN_USER) {
  const token = await createSessionTokenFromTokenUser(user, {
    sid: randomUUID(),
    sub: randomUUID(),
    authz_version: TEST_AUTHZ_VERSION,
  });
  return token;
}

type RequestOptions = {
  token?: string;
  headers?: Record<string, string>;
};

function request(path: string, options: RequestOptions = {}): NextRequest {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${options.token}`;
  }
  return new NextRequest(new URL(path, BASE), { headers });
}

function matchesProxy(pathname: string): boolean {
  const [pattern] = config.matcher as string[];
  return new RegExp(`^${pattern}$`).test(pathname);
}

function brokerEnv() {
  return withBrokerEnv(brokerOrigin, { AUTH_SECRET: TEST_JWT_SECRET });
}

let brokerOrigin = "";

describe("proxy de autenticacao", () => {
  let broker: MockBroker;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_JWT_SECRET;
    broker = await startMockBroker();
    brokerOrigin = broker.origin;
  });

  afterAll(async () => {
    await broker.close();
  });

  it("matcher segmenta exclusoes de API publica e arquivos estaticos", () => {
    expect(matchesProxy("/admin")).toBe(true);
    expect(matchesProxy("/api/auth/me")).toBe(true);
    expect(matchesProxy("/api/account/password")).toBe(true);
    expect(matchesProxy("/api/auth/mode-x")).toBe(true);
    expect(matchesProxy("/api/foo.png")).toBe(true);

    expect(matchesProxy("/api/auth/login")).toBe(false);
    expect(matchesProxy("/api/auth/mode")).toBe(false);
    expect(matchesProxy("/api/auth/logout")).toBe(false);
    expect(matchesProxy("/_next/static/x.js")).toBe(false);
    expect(matchesProxy("/logo.png")).toBe(false);
    expect(matchesProxy("/favicon.ico")).toBe(false);
    expect(matchesProxy("/images/fundo.webp")).toBe(false);
    expect(matchesProxy("/api/arquivo.webp")).toBe(true);
  });

  it("lista fixa de caminhos publicos do proxy", () => {
    expect([...PUBLIC_PROXY_PATHS].sort()).toEqual(
      [
        "/",
        "/auth/callback",
        "/auth/error",
        "/auth/login",
        "/auth/logout",
        "/login",
      ].sort(),
    );
    expect(isPublicProxyPath("/auth/login")).toBe(true);
    expect(isPublicProxyPath("/auth/qualquer")).toBe(false);
  });

  it("caminhos publicos nao passam pelo guard com sessao inativa", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      for (const path of PUBLIC_PROXY_PATHS) {
        const response = await proxy(request(path));
        expect(response.status, path).not.toBe(303);
        const location = response.headers.get("location");
        expect(location === null || !location.includes("/auth/login"), path).toBe(true);
      }
    } finally {
      restore();
    }
  });

  it("rotas publicas de /auth nao recebem cookie do proxy", async () => {
    const restore = brokerEnv();
    try {
      const token = await brokerSessionToken();
      for (const path of ["/auth/login", "/auth/logout", "/auth/callback", "/auth/error"]) {
        const response = await proxy(request(path, { token }));
        expect(response.headers.getSetCookie(), path).toEqual([]);
        expect(response.headers.get("location"), path).toBeNull();
      }
    } finally {
      restore();
    }
  });

  it("/auth/qualquer e pagina nova sao guardados com sessao inativa", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      for (const path of ["/auth/qualquer", "/pagina-nova"]) {
        const response = await proxy(request(path));
        expect(response.status, path).toBe(303);
        const location = new URL(response.headers.get("location")!);
        expect(location.pathname).toBe("/auth/login");
      }
    } finally {
      restore();
    }
  });

  it("API com sessao ativa nao recebe Set-Cookie", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("active");
    clearIntrospectionCache();
    try {
      const token = await brokerSessionToken({
        ...ADMIN_USER,
        mustChangePassword: false,
      });
      const response = await proxy(request("/api/auth/me", { token }));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("pagina publica / sem cookie segue sem redirect", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const response = await proxy(request("/"));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    } finally {
      restore();
    }
  });

  it("pagina protegida inativa redireciona para /auth/login", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const token = await brokerSessionToken();
      const response = await proxy(request("/admin", { token }));
      expect(response.status).toBe(303);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/auth/login");
      expect(location.searchParams.get("returnTo")).toBe("/admin");
    } finally {
      restore();
    }
  });

  it("/api/auth/me inativa responde 401 JSON", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const token = await brokerSessionToken();
      const response = await proxy(request("/api/auth/me", { token }));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "session_inactive" });
      expect(response.headers.get("location")).toBeNull();
    } finally {
      restore();
    }
  });

  it("APIs publicas de auth passam direto sem validador", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      for (const path of ["/api/auth/login", "/api/auth/mode", "/api/auth/logout"]) {
        const response = await proxy(request(path));
        expect(response.headers.get("x-middleware-next"), path).toBe("1");
      }
    } finally {
      restore();
    }
  });

  it("/api/auth/mode-x passa pelo validador", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const response = await proxy(request("/api/auth/mode-x"));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "session_inactive" });
    } finally {
      restore();
    }
  });

  it("/api/account/password com broker indisponivel responde 503 JSON e mantem cookie", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("server_error");
    try {
      const token = await brokerSessionToken();
      const response = await proxy(request("/api/account/password", { token }));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "auth_unavailable" });
      expect(response.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("pagina protegida com broker indisponivel responde 503 HTML", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("server_error");
    try {
      const token = await brokerSessionToken();
      const response = await proxy(request("/admin", { token }));
      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toMatch(/text\/html/);
      expect(response.headers.getSetCookie()).toEqual([]);
    } finally {
      restore();
    }
  });

  it("admin ativo em /dashboard redireciona para /admin", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("active");
    clearIntrospectionCache();
    try {
      const token = await brokerSessionToken();
      const response = await proxy(request("/dashboard", { token }));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/admin");
    } finally {
      restore();
    }
  });

  it("token com mustChangePassword em /admin redireciona para /primeiro-acesso", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("active");
    clearIntrospectionCache();
    try {
      const token = await brokerSessionToken({
        ...ADMIN_USER,
        mustChangePassword: true,
      });
      const response = await proxy(request("/admin", { token }));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/primeiro-acesso");
    } finally {
      restore();
    }
  });

  it("RSC inativa responde 401 text/plain sem Location", async () => {
    const restore = brokerEnv();
    broker.setBehaviour("inactive");
    try {
      const token = await brokerSessionToken();
      const response = await proxy(
        request("/admin", { token, headers: { RSC: "1" } }),
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toMatch(/text\/plain/);
      expect(response.headers.get("location")).toBeNull();
    } finally {
      restore();
    }
  });

  it("modo legacy: /admin sem cookie redireciona para /login", async () => {
    const previous = { ...process.env };
    process.env.AUTH_MODE = "legacy";
    process.env.AUTH_SECRET = TEST_JWT_SECRET;
    try {
      const response = await proxy(request("/admin"));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    } finally {
      process.env = previous;
    }
  });
});
