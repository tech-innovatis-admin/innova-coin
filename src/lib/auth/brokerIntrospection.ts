export const INTROSPECTION_CACHE_MS = 60_000;
export const INTROSPECTION_TIMEOUT_MS = 3_000;

export type BrokerSessionState = "active" | "inactive" | "unavailable";

export type BrokerSessionPayload = {
  sid: string;
  authz_version: number;
  sub: string;
  user_id?: number;
  auth: "broker";
};

export type IntrospectionResult = {
  state: BrokerSessionState;
  authz_version?: number;
};

type IntrospectionCacheEntry = {
  state: "active" | "inactive";
  authzVersion?: number;
  expiresAt: number;
};

const introspectionCache = new Map<string, IntrospectionCacheEntry>();
let introspectionCacheTtlMs = INTROSPECTION_CACHE_MS;
let introspectionTimeoutMs = INTROSPECTION_TIMEOUT_MS;

function env(name: string): string | undefined {
  return process.env[name]?.trim();
}

function brokerIssuer() {
  return (env("CENTRAL_OIDC_ISSUER") || "https://hub.innovatismc.com").replace(/\/$/, "");
}

function brokerClientId() {
  return env("CENTRAL_OIDC_CLIENT_ID") || "innova-coin";
}

function brokerClientSecret() {
  return env("CENTRAL_OIDC_CLIENT_SECRET") ?? "";
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export function clearIntrospectionCache() {
  introspectionCache.clear();
}

/** O contrato central limita o cache a 60s; valores maiores são truncados. */
export function setIntrospectionCacheTtlMs(ttlMs: number) {
  introspectionCacheTtlMs = Math.min(ttlMs, INTROSPECTION_CACHE_MS);
}

export function setIntrospectionTimeoutMs(timeoutMs: number) {
  introspectionTimeoutMs = timeoutMs;
}

export async function introspectCentralSession(
  sid: string,
  fetcher: typeof fetch = fetch,
  timeoutMs: number = introspectionTimeoutMs,
): Promise<IntrospectionResult> {
  const clientSecret = brokerClientSecret();
  if (!clientSecret) {
    console.error("[auth] introspeccao central sem CENTRAL_OIDC_CLIENT_SECRET");
    return { state: "inactive" };
  }

  let response: Response;
  try {
    const authorization = `Basic ${Buffer.from(`${brokerClientId()}:${clientSecret}`).toString("base64")}`;
    response = await fetcher(`${brokerIssuer()}/oidc/introspect`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        authorization,
      },
      body: new URLSearchParams({ token: sid, token_type_hint: "access_token" }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.error("[auth] introspeccao central indisponivel", errorName(error));
    return { state: "unavailable" };
  }

  if (response.status === 401 || response.status === 403) {
    console.error("[auth] introspeccao central rejeitou a credencial do cliente", response.status);
    return { state: "inactive" };
  }

  if (response.status === 429 || response.status >= 500) {
    console.error("[auth] introspeccao central indisponivel", response.status);
    return { state: "unavailable" };
  }

  if (!response.ok) {
    return { state: "inactive" };
  }

  let payload: { active?: boolean; authz_version?: number | string } | null;
  try {
    payload = (await response.json()) as typeof payload;
  } catch (error) {
    console.error("[auth] introspeccao central com corpo invalido", errorName(error));
    return { state: "unavailable" };
  }

  if (payload === null || typeof payload !== "object") {
    console.error("[auth] introspeccao central com corpo invalido", errorName(new TypeError("invalid_body")));
    return { state: "unavailable" };
  }

  const authzVersion =
    typeof payload.authz_version === "number"
      ? payload.authz_version
      : typeof payload.authz_version === "string"
        ? Number.parseInt(payload.authz_version, 10)
        : undefined;

  return {
    state: payload.active === true ? "active" : "inactive",
    authz_version: Number.isFinite(authzVersion) ? authzVersion : undefined,
  };
}

function withAuthzVersion(
  state: "active" | "inactive",
  introspected: number | undefined,
  expected: number,
): BrokerSessionState {
  if (state !== "active") {
    return "inactive";
  }
  if (introspected !== undefined && introspected !== expected) {
    return "inactive";
  }
  return "active";
}

export async function validateBrokerSession(
  session: BrokerSessionPayload,
  fetcher: typeof fetch = fetch,
): Promise<BrokerSessionState> {
  const now = Date.now();
  const cached = introspectionCache.get(session.sid);
  if (cached && cached.expiresAt > now) {
    return withAuthzVersion(cached.state, cached.authzVersion, session.authz_version);
  }

  const result = await introspectCentralSession(session.sid, fetcher);
  if (result.state === "unavailable") {
    introspectionCache.delete(session.sid);
    return "unavailable";
  }

  introspectionCache.set(session.sid, {
    state: result.state,
    authzVersion: result.authz_version,
    expiresAt: now + introspectionCacheTtlMs,
  });

  return withAuthzVersion(result.state, result.authz_version, session.authz_version);
}

export function readBrokerSessionFromPayload(
  payload: Record<string, unknown>,
): BrokerSessionPayload | null {
  if (payload.auth !== "broker") {
    return null;
  }
  const sid = typeof payload.sid === "string" ? payload.sid : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const authzVersion =
    typeof payload.authz_version === "number"
      ? payload.authz_version
      : typeof payload.authz_version === "string"
        ? Number.parseInt(payload.authz_version, 10)
        : NaN;
  if (!sid || !sub || !Number.isFinite(authzVersion)) {
    return null;
  }
  const userIdRaw = payload.user_id;
  const userId =
    typeof userIdRaw === "number"
      ? userIdRaw
      : typeof userIdRaw === "string"
        ? Number.parseInt(userIdRaw, 10)
        : undefined;
  return {
    sid,
    sub,
    authz_version: authzVersion,
    user_id: Number.isFinite(userId) ? userId : undefined,
    auth: "broker",
  };
}
