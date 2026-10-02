/**
 * Broker OIDC simulado para os testes de autenticação.
 * Só é importado por arquivos `*.test.ts`; nenhum código de aplicação depende dele.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import {
  clearIntrospectionCache,
  INTROSPECTION_CACHE_MS,
  INTROSPECTION_TIMEOUT_MS,
  setIntrospectionCacheTtlMs,
  setIntrospectionTimeoutMs,
} from "@/lib/auth/brokerIntrospection";

export const TEST_JWT_SECRET = "test-jwt-secret-innova-coin-32-ch";
export const TEST_CLIENT_SECRET = "test-client-secret";
export const TEST_AUTHZ_VERSION = 7;
export const TEST_HUB_HOME = "https://hub.example.com/";

export type MockBrokerBehaviour =
  | "active"
  | "inactive"
  | "unauthorized"
  | "server_error"
  | "rate_limited"
  | "hang"
  | "null_body";

export type MockBroker = {
  readonly origin: string;
  readonly calls: number;
  setBehaviour: (behaviour: MockBrokerBehaviour) => void;
  setAuthzVersion: (version: number) => void;
  close: () => Promise<void>;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function drain(req: IncomingMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    req.on("data", () => undefined);
    req.on("end", () => resolve());
    req.on("error", reject);
  });
}

export async function startMockBroker(
  initial: MockBrokerBehaviour = "active",
): Promise<MockBroker> {
  let behaviour = initial;
  let authzVersion = TEST_AUTHZ_VERSION;
  const counters = { calls: 0 };
  const hanging = new Set<ServerResponse>();

  const server: Server = createServer((req, res) => {
    void (async () => {
      await drain(req);
      if (req.method !== "POST" || !(req.url ?? "").startsWith("/oidc/introspect")) {
        res.writeHead(404, JSON_HEADERS);
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }

      counters.calls += 1;

      if (behaviour === "hang") {
        hanging.add(res);
        return;
      }
      if (behaviour === "unauthorized") {
        res.writeHead(401, JSON_HEADERS);
        res.end(JSON.stringify({ error: "invalid_client" }));
        return;
      }
      if (behaviour === "server_error") {
        res.writeHead(502, JSON_HEADERS);
        res.end(JSON.stringify({ error: "bad_gateway" }));
        return;
      }
      if (behaviour === "rate_limited") {
        res.writeHead(429, JSON_HEADERS);
        res.end(JSON.stringify({ error: "too_many_requests" }));
        return;
      }
      if (behaviour === "null_body") {
        res.writeHead(200, JSON_HEADERS);
        res.end("null");
        return;
      }

      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify({ active: behaviour === "active", authz_version: authzVersion }));
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("mock broker failed to bind");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    get calls() {
      return counters.calls;
    },
    setBehaviour(next: MockBrokerBehaviour) {
      behaviour = next;
    },
    setAuthzVersion(version: number) {
      authzVersion = version;
    },
    close: async () => {
      for (const res of hanging) {
        res.destroy();
      }
      hanging.clear();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

/** Aponta a app para o broker simulado e devolve a função que restaura o ambiente. */
export function withBrokerEnv(origin: string, extra: Partial<NodeJS.ProcessEnv> = {}): () => void {
  const previous = { ...process.env };
  process.env.AUTH_MODE = "broker";
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.CENTRAL_OIDC_ISSUER = origin;
  process.env.CENTRAL_OIDC_CLIENT_ID = "innova-coin";
  process.env.CENTRAL_OIDC_CLIENT_SECRET = TEST_CLIENT_SECRET;
  process.env.CENTRAL_OIDC_REDIRECT_URI = "http://127.0.0.1:3007/auth/callback";
  process.env.APP_URL = "http://127.0.0.1:3007";
  process.env.HUB_HOME_URL = TEST_HUB_HOME;
  Object.assign(process.env, extra);
  clearIntrospectionCache();
  setIntrospectionCacheTtlMs(INTROSPECTION_CACHE_MS);
  setIntrospectionTimeoutMs(INTROSPECTION_TIMEOUT_MS);
  return () => {
    process.env = previous;
    clearIntrospectionCache();
    setIntrospectionCacheTtlMs(INTROSPECTION_CACHE_MS);
    setIntrospectionTimeoutMs(INTROSPECTION_TIMEOUT_MS);
  };
}
