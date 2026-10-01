import { createHash } from "node:crypto";

import { EncryptJWT, jwtDecrypt } from "jose";
import * as client from "openid-client";

import { TRANSACTION_COOKIE as TRANSACTION_COOKIE_NAME } from "@/lib/auth/config";
import { resolveCookieSecure } from "@/lib/auth/cookieFlags";

export class CentralOidcConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CentralOidcConfigError";
  }
}

export { TRANSACTION_COOKIE_NAME as TRANSACTION_COOKIE };
export const CLAIM_USER_ID = "https://innovatis.com/claims/user_id";
export const CLAIM_PLATFORMS = "https://innovatis.com/claims/platforms";
export const CLAIM_ROLES = "https://innovatis.com/claims/roles";
export const CLAIM_AUTHZ_VERSION = "https://innovatis.com/claims/authz_version";
export const PLATFORM_CODE = "innovacoin";
export const SESSION_MAX_AGE = 3600;
export const TRANSACTION_MAX_AGE = 600;

export type CentralOidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  logoutUri: string;
  scopes: string[];
};

export type OAuthTransaction = {
  state: string;
  nonce: string;
  code_verifier: string;
  returnTo?: string;
};

export type CentralIdentity = {
  sub: string;
  sid: string;
  userId: number | null;
  platforms: string[];
  roles: string[];
  authzVersion: number;
  email: string | null;
  name: string | null;
};

let cachedConfig: client.Configuration | null = null;
let cachedIssuer: string | null = null;

function env(name: string): string | undefined {
  return process.env[name]?.trim();
}

function required(name: string) {
  const value = env(name);
  if (!value) {
    throw new CentralOidcConfigError(`Missing env: ${name}`);
  }
  return value;
}

function bridgeSecret() {
  return env("SSO_BRIDGE_SECRET") || env("AUTH_SECRET");
}

export function getCentralOidcConfig(): CentralOidcConfig {
  const issuer = (env("CENTRAL_OIDC_ISSUER") || "https://hub.innovatismc.com").replace(
    /\/$/,
    "",
  );
  const clientId = env("CENTRAL_OIDC_CLIENT_ID") || "innova-coin";
  const clientSecret = required("CENTRAL_OIDC_CLIENT_SECRET");
  const appOrigin = (env("APP_URL") || "http://localhost:3007").replace(/\/$/, "");
  const redirectUri = env("CENTRAL_OIDC_REDIRECT_URI") || `${appOrigin}/auth/callback`;
  const logoutUri = env("CENTRAL_OIDC_LOGOUT_URI") || `${appOrigin}/login`;
  const scopes = (env("CENTRAL_OIDC_SCOPES") || "openid profile email platforms")
    .split(/\s+/)
    .filter(Boolean);

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    logoutUri,
    scopes,
  };
}

export function resetOidcConfigurationCache() {
  cachedConfig = null;
  cachedIssuer = null;
}

function encryptionKey(): Uint8Array {
  const secret = bridgeSecret();
  if (!secret) {
    throw new CentralOidcConfigError("Missing env: SSO_BRIDGE_SECRET or AUTH_SECRET");
  }
  return createHash("sha256").update(secret).digest();
}

function discoveryOptions(issuer: string): client.DiscoveryRequestOptions | undefined {
  if (!issuer.startsWith("http://")) {
    return undefined;
  }
  return { execute: [client.allowInsecureRequests] };
}

export async function getOidcConfiguration(): Promise<client.Configuration> {
  const cfg = getCentralOidcConfig();
  if (cachedConfig && cachedIssuer === cfg.issuer) {
    return cachedConfig;
  }

  cachedConfig = await client.discovery(
    new URL(cfg.issuer),
    cfg.clientId,
    { redirect_uris: [cfg.redirectUri] },
    client.ClientSecretBasic(cfg.clientSecret),
    discoveryOptions(cfg.issuer),
  );
  if (cfg.issuer.startsWith("http://")) {
    client.allowInsecureRequests(cachedConfig);
  }
  cachedIssuer = cfg.issuer;
  return cachedConfig;
}

export async function encryptTransaction(payload: OAuthTransaction): Promise<string> {
  return new EncryptJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${TRANSACTION_MAX_AGE}s`)
    .encrypt(encryptionKey());
}

export async function decryptTransaction(value: string): Promise<OAuthTransaction | null> {
  try {
    const { payload } = await jwtDecrypt(value, encryptionKey());
    const txn = payload as Partial<OAuthTransaction>;
    if (
      typeof txn.state !== "string" ||
      typeof txn.nonce !== "string" ||
      typeof txn.code_verifier !== "string"
    ) {
      return null;
    }
    return {
      state: txn.state,
      nonce: txn.nonce,
      code_verifier: txn.code_verifier,
      returnTo: typeof txn.returnTo === "string" ? txn.returnTo : undefined,
    };
  } catch {
    return null;
  }
}

export async function buildCentralAuthorizeUrl(input: {
  state: string;
  nonce: string;
  codeChallenge: string;
  prompt?: string;
}) {
  const cfg = getCentralOidcConfig();
  const oidc = await getOidcConfiguration();
  const params: Record<string, string> = {
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(" "),
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    response_type: "code",
  };
  if (input.prompt) {
    params.prompt = input.prompt;
  }
  return client.buildAuthorizationUrl(oidc, params);
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((entry): entry is string => typeof entry === "string");
}

export function parseCentralClaims(claims: Record<string, unknown>): CentralIdentity {
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const sid = typeof claims.sid === "string" ? claims.sid : "";
  if (!sub || !sid) {
    throw new CentralOidcConfigError("ID token missing sub or sid");
  }

  const authzRaw = claims[CLAIM_AUTHZ_VERSION];
  const authzVersion =
    typeof authzRaw === "number"
      ? authzRaw
      : typeof authzRaw === "string"
        ? Number.parseInt(authzRaw, 10)
        : 0;

  const userIdRaw = claims[CLAIM_USER_ID];
  const userId =
    typeof userIdRaw === "number"
      ? userIdRaw
      : typeof userIdRaw === "string"
        ? Number.parseInt(userIdRaw, 10)
        : null;

  return {
    sub,
    sid,
    userId: Number.isFinite(userId) ? userId : null,
    platforms: parseStringArray(claims[CLAIM_PLATFORMS]),
    roles: parseStringArray(claims[CLAIM_ROLES]),
    authzVersion: Number.isFinite(authzVersion) ? authzVersion : 0,
    email: typeof claims.email === "string" ? claims.email : null,
    name: typeof claims.name === "string" ? claims.name : null,
  };
}

export function hasCentralPlatformAccess(
  identity: CentralIdentity,
  platformCode: string = PLATFORM_CODE,
): boolean {
  return identity.platforms.includes(platformCode);
}

export async function exchangeCentralCallback(input: {
  callbackUrl: URL | { toString(): string };
  expectedState: string;
  expectedNonce: string;
  codeVerifier: string;
}): Promise<CentralIdentity> {
  const cfg = getCentralOidcConfig();
  const oidc = await getOidcConfiguration();
  const callbackUrl = new URL(input.callbackUrl.toString());
  const registeredRedirectUri = cfg.redirectUri;
  const previousFetch = oidc[client.customFetch];

  oidc[client.customFetch] = async (url, options) => {
    let nextOptions = options;
    if (
      options?.body instanceof URLSearchParams &&
      options.body.get("grant_type") === "authorization_code"
    ) {
      const body = new URLSearchParams(options.body);
      body.set("redirect_uri", registeredRedirectUri);
      nextOptions = { ...options, body };
    }
    if (previousFetch) {
      return previousFetch(url, nextOptions);
    }
    return fetch(url, nextOptions as RequestInit);
  };

  try {
    const tokens = await client.authorizationCodeGrant(oidc, callbackUrl, {
      pkceCodeVerifier: input.codeVerifier,
      expectedState: input.expectedState,
      expectedNonce: input.expectedNonce,
    });

    const claims = tokens.claims();
    if (!claims) {
      throw new CentralOidcConfigError("ID token claims missing");
    }

    if (claims.iss !== cfg.issuer) {
      throw new CentralOidcConfigError("Invalid issuer in ID token");
    }

    const audience = claims.aud;
    const audiences = Array.isArray(audience) ? audience : [audience];
    if (!audiences.includes(cfg.clientId)) {
      throw new CentralOidcConfigError("Invalid audience in ID token");
    }

    if (claims.nonce !== input.expectedNonce) {
      throw new CentralOidcConfigError("Invalid nonce in ID token");
    }

    return parseCentralClaims(claims as Record<string, unknown>);
  } finally {
    if (previousFetch === undefined) {
      delete oidc[client.customFetch];
    } else {
      oidc[client.customFetch] = previousFetch;
    }
  }
}

export function cookieSecure(headers: Headers) {
  return resolveCookieSecure(headers);
}

const BIND_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);

export function publicAppOrigin(request: { headers: Headers; nextUrl: URL }) {
  for (const raw of [env("APP_URL"), env("APP_ORIGIN")]) {
    const origin = raw?.replace(/\/$/, "") || "";
    if (origin && !origin.includes("0.0.0.0")) {
      return origin;
    }
  }

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host ||
    "";
  const hostname = host.replace(/:\d+$/, "");
  if (hostname && !BIND_HOSTS.has(hostname)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      request.nextUrl.protocol.replace(":", "") ||
      "https";
    return `${proto}://${host}`;
  }

  return "http://localhost:3007";
}
