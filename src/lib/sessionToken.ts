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

type SessionPayload = JWTPayload & {
  user: SessionTokenUser;
};

function getSessionSecret() {
  const secret =
    process.env.AUTH_SECRET || process.env.DB_PASSWORD || "change-this-secret";

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

function normalizeTokenArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ user: toSessionTokenUser(user) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

export async function readSessionPayload(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret());
  return payload as SessionPayload;
}

export async function readSessionUserFromToken(token: string) {
  const payload = await readSessionPayload(token);
  const user = payload.user;

  return {
    id: String(user?.id ?? ""),
    platforms: normalizeTokenArray(user?.platforms),
    innovacoinRoles: normalizeTokenArray(user?.innovacoinRoles),
    mustChangePassword: user?.mustChangePassword === true,
  } satisfies SessionTokenUser;
}
