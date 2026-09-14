import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const SESSION_DURATION = "7d";

export const SESSION_COOKIE_NAME = "innova_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string | null;
  role: string;
  username: string | null;
  name: string | null;
  photo: string | null;
  platforms: string[];
  innovacoinRoles: string[];
  mustChangePassword: boolean;
};

export type SessionTokenUser = {
  id: string;
  platforms: string[];
  innovacoinRoles: string[];
  mustChangePassword: boolean;
};

export type SessionTokenReadResult = {
  user: SessionTokenUser;
  hasMustChangePasswordClaim: boolean;
};

export type BrokerSessionFields = {
  sid: string;
  authz_version: number;
  sub: string;
};

type SessionPayload = JWTPayload & {
  user: SessionTokenUser;
  auth?: "broker";
  sid?: string;
  authz_version?: number;
  sub?: string;
};

function getSessionSecret() {
  const secret =
    process.env["AUTH_SECRET"] || process.env["DB_PASSWORD"] || "change-this-secret";

  return new TextEncoder().encode(secret);
}

function toSessionTokenUser(user: SessionUser): SessionTokenUser {
  return {
    id: user.id,
    platforms: user.platforms,
    innovacoinRoles: user.innovacoinRoles,
    mustChangePassword: user.mustChangePassword,
  };
}

function hasOwnProperty(value: unknown, propertyName: string) {
  if (value == null) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(value, propertyName);
}

function normalizeTokenArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function applyBrokerFields(
  payload: SessionPayload,
  broker?: BrokerSessionFields,
): SessionPayload {
  if (!broker) {
    return payload;
  }

  return {
    ...payload,
    auth: "broker",
    sid: broker.sid,
    authz_version: broker.authz_version,
    sub: broker.sub,
  };
}

function brokerFieldsFromPayload(payload: SessionPayload): BrokerSessionFields | null {
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

  return {
    sid,
    sub,
    authz_version: authzVersion,
  };
}

export async function createSessionToken(
  user: SessionUser,
  broker?: BrokerSessionFields,
) {
  const payload = applyBrokerFields(
    { user: toSessionTokenUser(user) },
    broker,
  );

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

export async function createSessionTokenFromTokenUser(
  user: SessionTokenUser,
  broker?: BrokerSessionFields,
) {
  const payload = applyBrokerFields({ user }, broker);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

export async function readSessionPayload(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret());
  return payload as SessionPayload;
}

function readSessionUserFromPayload(payload: SessionPayload): SessionTokenReadResult {
  const user = payload.user;

  return {
    user: {
      id: String(user?.id ?? ""),
      platforms: normalizeTokenArray(user?.platforms),
      innovacoinRoles: normalizeTokenArray(user?.innovacoinRoles),
      mustChangePassword: user?.mustChangePassword === true,
    } satisfies SessionTokenUser,
    hasMustChangePasswordClaim: hasOwnProperty(user, "mustChangePassword"),
  };
}

export async function readSessionUserStateFromToken(token: string) {
  const payload = await readSessionPayload(token);
  return readSessionUserFromPayload(payload);
}

export async function readBrokerFieldsFromToken(token: string) {
  const payload = await readSessionPayload(token);
  return brokerFieldsFromPayload(payload);
}

export async function readSessionUserFromToken(token: string) {
  const sessionState = await readSessionUserStateFromToken(token);
  return {
    ...sessionState.user,
  } satisfies SessionTokenUser;
}
