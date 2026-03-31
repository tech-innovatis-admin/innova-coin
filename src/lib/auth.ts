import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import { getDbPool } from "@/lib/db";
import {
  ADMIN_HOME_PATH,
  getPostLoginPath,
  getRedirectTargetForPathname,
  hasInnovacoinPlatform,
  LOGIN_PATH,
  HEAD_DASHBOARD_PATH,
} from "@/lib/platformAccess";
import {
  createSessionToken as createSignedSessionToken,
  readSessionPayload,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  type SessionUser,
} from "@/lib/sessionToken";

type UserRow = {
  id: string | number;
  email: string | null;
  role: string;
  username: string | null;
  name: string | null;
  photo: string | null;
  hash: string | null;
  platforms: string[] | null;
  innovacoin_roles: string[] | null;
};

type SessionUserRow = Omit<UserRow, "hash">;

type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export type LoginAttemptResult =
  | {
      success: false;
      status: number;
      error: string;
    }
  | {
      success: true;
      redirectTo: string;
      user: SessionUser;
    };

function isLocalHost(host: string) {
  const trimmedHost = host.trim().toLowerCase();
  const hostname = trimmedHost.startsWith("[")
    ? trimmedHost.slice(1, Math.max(trimmedHost.indexOf("]"), 1))
    : trimmedHost.split(":")[0] ?? "";

  if (!hostname) {
    return false;
  }

  if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".local")) {
    return true;
  }

  return (
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

async function shouldUseSecureCookie() {
  const configuredValue = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (configuredValue === "true") {
    return true;
  }

  if (configuredValue === "false") {
    return false;
  }

  const headerStore = await headers();
  const forwardedProto = headerStore
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const host =
    headerStore.get("x-forwarded-host")?.trim() ||
    headerStore.get("host")?.trim() ||
    "";

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return process.env.NODE_ENV === "production" && host !== "" && !isLocalHost(host);
}

async function getSessionCookieOptions(): Promise<SessionCookieOptions> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookie(),
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

function getBearerTokenFromAuthorizationHeader(
  authorizationHeader: string | null | undefined,
) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, ...parts] = authorizationHeader.trim().split(/\s+/);

  if (!scheme || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  const token = parts.join(" ").trim();
  return token || null;
}

function isAuthDebugEnabled() {
  return process.env.AUTH_DEBUG?.trim().toLowerCase() === "true";
}

function debugAuth(message: string, details?: Record<string, unknown>) {
  if (!isAuthDebugEnabled()) {
    return;
  }

  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[auth] ${message}${payload}`);
}

function mapSessionUser(row: SessionUserRow): SessionUser {
  return {
    id: String(row.id),
    email: row.email,
    role: row.role,
    username: row.username,
    name: row.name,
    photo: row.photo,
    platforms: row.platforms ?? [],
    innovacoinRoles: row.innovacoin_roles ?? [],
  } satisfies SessionUser;
}

async function getUserSnapshotById(userId: string) {
  if (!/^\d+$/.test(userId.trim())) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<SessionUserRow>(
    `
      select
        id,
        email,
        role,
        username,
        name,
        photo,
        coalesce(platforms, array[]::varchar[]) as platforms,
        coalesce(innovacoin_roles, array[]::varchar[]) as innovacoin_roles
      from public.users
      where id = $1::bigint
      limit 1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return mapSessionUser(user);
}

export async function authenticateUser(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<UserRow>(
    `
      select
        id,
        email,
        role,
        username,
        name,
        photo,
        hash,
        coalesce(platforms, array[]::varchar[]) as platforms,
        coalesce(innovacoin_roles, array[]::varchar[]) as innovacoin_roles
      from public.users
      where lower(coalesce(email, '')) = $1
         or lower(coalesce(username, '')) = $1
      limit 1
    `,
    [normalizedIdentifier],
  );

  const user = result.rows[0];

  if (!user?.hash) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.hash);

  if (!passwordMatches) {
    return null;
  }

  return mapSessionUser(user);
}

export async function validateLoginAttempt(
  identifier: string,
  password: string,
): Promise<LoginAttemptResult> {
  const normalizedIdentifier = identifier.trim();
  const normalizedPassword = password;

  if (!normalizedIdentifier || !normalizedPassword) {
    return {
      success: false,
      status: 400,
      error: "Informe usuário/e-mail e senha.",
    };
  }

  const user = await authenticateUser(normalizedIdentifier, normalizedPassword);

  if (!user) {
    return {
      success: false,
      status: 401,
      error: "Credenciais inválidas.",
    };
  }

  if (!hasInnovacoinPlatform(user)) {
    return {
      success: false,
      status: 403,
      error: "Usuário sem acesso à plataforma Innovacoin.",
    };
  }

  const redirectTo = getPostLoginPath(user);

  if (!redirectTo) {
    return {
      success: false,
      status: 403,
      error: "Usuário sem perfil configurado na plataforma Innovacoin.",
    };
  }

  return {
    success: true,
    redirectTo,
    user,
  };
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const session = await createSignedSessionToken(user);
  const options = await getSessionCookieOptions();
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host")?.trim() ||
    headerStore.get("host")?.trim() ||
    "";
  const forwardedProto = headerStore.get("x-forwarded-proto")?.trim() || null;

  cookieStore.set(SESSION_COOKIE_NAME, session, options);

  debugAuth("session-created", {
    userId: user.id,
    host,
    forwardedProto,
    secure: options.secure,
    platforms: user.platforms,
    innovacoinRoles: user.innovacoinRoles,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const options = await getSessionCookieOptions();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...options,
    maxAge: 0,
  });
  debugAuth("session-deleted");
}

export async function setSessionCookie(
  response: NextResponse,
  user: SessionUser,
  sessionToken?: string,
) {
  const session = sessionToken ?? (await createSignedSessionToken(user));
  const options = await getSessionCookieOptions();

  response.cookies.set(SESSION_COOKIE_NAME, session, options);

  debugAuth("session-cookie-attached", {
    userId: user.id,
    secure: options.secure,
    platforms: user.platforms,
    innovacoinRoles: user.innovacoinRoles,
  });
}

export async function clearSessionCookie(response: NextResponse) {
  const options = await getSessionCookieOptions();

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...options,
    maxAge: 0,
  });

  debugAuth("session-cookie-cleared", {
    secure: options.secure,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const headerStore = await headers();
  const tokenFromAuthorizationHeader = getBearerTokenFromAuthorizationHeader(
    headerStore.get("authorization"),
  );
  const token = tokenFromCookie || tokenFromAuthorizationHeader;

  if (!token) {
    debugAuth("session-missing", {
      host:
        headerStore.get("x-forwarded-host")?.trim() ||
        headerStore.get("host")?.trim() ||
        "",
      forwardedProto: headerStore.get("x-forwarded-proto")?.trim() || null,
    });
    return null;
  }

  try {
    const payload = await readSessionPayload(token);
    const latestUser = await getUserSnapshotById(String(payload.user?.id ?? ""));

    if (!latestUser) {
      debugAuth("session-user-not-found", {
        source: tokenFromCookie ? "cookie" : "authorization-header",
        userId: payload.user?.id ?? null,
      });
      return null;
    }

    if (!getPostLoginPath(latestUser)) {
      debugAuth("session-without-platform-access", {
        source: tokenFromCookie ? "cookie" : "authorization-header",
        userId: latestUser.id,
        platforms: latestUser.platforms,
        innovacoinRoles: latestUser.innovacoinRoles,
      });
      return null;
    }

    debugAuth("session-loaded", {
      userId: latestUser.id,
      source: tokenFromCookie ? "cookie" : "authorization-header",
      platforms: latestUser.platforms,
      innovacoinRoles: latestUser.innovacoinRoles,
    });
    return latestUser;
  } catch {
    debugAuth("session-invalid");
    return null;
  }
}

export async function requireAuthenticatedUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();
  const redirectTo = getRedirectTargetForPathname(user, ADMIN_HOME_PATH);

  if (redirectTo) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireHeadUser() {
  const user = await requireAuthenticatedUser();
  const redirectTo = getRedirectTargetForPathname(user, HEAD_DASHBOARD_PATH);

  if (redirectTo) {
    redirect(redirectTo);
  }

  return user;
}
