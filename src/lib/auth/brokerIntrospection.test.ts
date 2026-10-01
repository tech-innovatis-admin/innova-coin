import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  clearIntrospectionCache,
  INTROSPECTION_CACHE_MS,
  INTROSPECTION_TIMEOUT_MS,
  introspectCentralSession,
  setIntrospectionCacheTtlMs,
  setIntrospectionTimeoutMs,
  validateBrokerSession,
  type BrokerSessionPayload,
} from "./brokerIntrospection";
import { startMockBroker, TEST_AUTHZ_VERSION, withBrokerEnv, type MockBroker } from "./testBroker";

function session(overrides: Partial<BrokerSessionPayload> = {}): BrokerSessionPayload {
  return {
    sid: overrides.sid ?? randomUUID(),
    sub: overrides.sub ?? randomUUID(),
    authz_version: overrides.authz_version ?? TEST_AUTHZ_VERSION,
    auth: "broker",
  };
}

describe("introspeccao central em tres estados", () => {
  let broker: MockBroker;

  beforeAll(async () => {
    broker = await startMockBroker();
  });

  afterAll(async () => {
    await broker.close();
  });

  it("o padrao do contrato e cache de 60s e timeout de 3s", () => {
    expect(INTROSPECTION_CACHE_MS).toBe(60_000);
    expect(INTROSPECTION_TIMEOUT_MS).toBe(3_000);
  });

  it("active: true vira active e entra no cache", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("active");
    try {
      const current = session();
      const before = broker.calls;
      expect(await validateBrokerSession(current)).toBe("active");
      expect(broker.calls).toBe(before + 1);
      expect(await validateBrokerSession(current)).toBe("active");
      expect(broker.calls).toBe(before + 1);
    } finally {
      restore();
    }
  });

  it("active: false vira inactive e entra no cache", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("inactive");
    try {
      const current = session();
      const before = broker.calls;
      expect(await validateBrokerSession(current)).toBe("inactive");
      expect(await validateBrokerSession(current)).toBe("inactive");
      expect(broker.calls).toBe(before + 1);
    } finally {
      restore();
    }
  });

  it("5xx vira unavailable e nunca entra no cache", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("server_error");
    try {
      const current = session();
      const before = broker.calls;
      expect(await validateBrokerSession(current)).toBe("unavailable");
      expect(await validateBrokerSession(current)).toBe("unavailable");
      expect(broker.calls).toBe(before + 2);
    } finally {
      restore();
    }
  });

  it("429 vira unavailable", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("rate_limited");
    try {
      expect(await validateBrokerSession(session())).toBe("unavailable");
    } finally {
      restore();
    }
  });

  it("timeout de introspeccao vira unavailable", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("hang");
    setIntrospectionTimeoutMs(150);
    try {
      const started = Date.now();
      expect(await validateBrokerSession(session())).toBe("unavailable");
      expect(Date.now() - started).toBeLessThan(2_000);
    } finally {
      restore();
    }
  });

  it("erro de rede vira unavailable", async () => {
    const restore = withBrokerEnv(broker.origin);
    try {
      const failing: typeof fetch = async () => {
        throw new TypeError("fetch failed");
      };
      const result = await introspectCentralSession(randomUUID(), failing);
      expect(result.state).toBe("unavailable");
    } finally {
      restore();
    }
  });

  it("401 do broker vira inactive (fail closed)", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("unauthorized");
    try {
      expect(await validateBrokerSession(session())).toBe("inactive");
    } finally {
      restore();
    }
  });

  it("sem client secret o estado e inactive e o broker nao e chamado", async () => {
    const restore = withBrokerEnv(broker.origin, { CENTRAL_OIDC_CLIENT_SECRET: "" });
    broker.setBehaviour("active");
    try {
      const before = broker.calls;
      expect(await validateBrokerSession(session())).toBe("inactive");
      expect(broker.calls).toBe(before);
    } finally {
      restore();
    }
  });

  it("authz_version diferente vira inactive", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("active");
    broker.setAuthzVersion(TEST_AUTHZ_VERSION + 1);
    try {
      expect(await validateBrokerSession(session())).toBe("inactive");
    } finally {
      broker.setAuthzVersion(TEST_AUTHZ_VERSION);
      restore();
    }
  });

  it("corpo JSON null vira unavailable", async () => {
    const restore = withBrokerEnv(broker.origin);
    broker.setBehaviour("null_body");
    try {
      expect(await validateBrokerSession(session())).toBe("unavailable");
    } finally {
      restore();
    }
  });

  it("unavailable remove entrada active antiga do cache", async () => {
    const restore = withBrokerEnv(broker.origin);
    setIntrospectionCacheTtlMs(30);
    try {
      const current = session();
      broker.setBehaviour("active");
      const beforeActive = broker.calls;
      expect(await validateBrokerSession(current)).toBe("active");
      expect(broker.calls).toBe(beforeActive + 1);

      await new Promise((resolve) => setTimeout(resolve, 40));

      broker.setBehaviour("server_error");
      expect(await validateBrokerSession(current)).toBe("unavailable");

      broker.setBehaviour("inactive");
      const beforeInactive = broker.calls;
      expect(await validateBrokerSession(current)).toBe("inactive");
      expect(broker.calls).toBe(beforeInactive + 1);
    } finally {
      restore();
    }
  });

  it("depois de unavailable, uma resposta active volta a valer", async () => {
    const restore = withBrokerEnv(broker.origin);
    try {
      const current = session();
      broker.setBehaviour("server_error");
      expect(await validateBrokerSession(current)).toBe("unavailable");
      broker.setBehaviour("active");
      clearIntrospectionCache();
      expect(await validateBrokerSession(current)).toBe("active");
    } finally {
      restore();
    }
  });
});
