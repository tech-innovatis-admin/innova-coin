import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import { credentialsEnabled } from "@/lib/auth/authMode";
import { resolveCookieSecure } from "@/lib/auth/cookieFlags";
import { getDbPool } from "@/lib/db";
import {
  ADMIN_HOME_PATH,
  FIRST_ACCESS_PATH,
  getPostLoginPath,
  getRedirectTargetForPathname,
  LOGIN_PATH,
  HEAD_DASHBOARD_PATH,
} from "@/lib/platformAccess";
import { getPasswordPolicyErrors } from "@/lib/passwordPolicy";
import {
  createSessionToken as createSignedSessionToken,
  readSessionPayload,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  type BrokerSessionFields,
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
  must_change_password: boolean | null;
  cognito_sub?: string | null;
};

type SessionUserRow = Omit<UserRow, "hash">;

type UserPasswordRow = {
  id: string | number;
  hash: string | null;
};

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

export type ChangePasswordAttemptResult =
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

type RequireAuthenticatedUserOptions = {
  allowMustChangePassword?: boolean;
};

async function shouldUseSecureCookie() {
  return resolveCookieSecure(await headers());
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
  return process.env["AUTH_DEBUG"]?.trim().toLowerCase() === "true";
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
    mustChangePassword: row.must_change_password === true,
  } satisfies SessionUser;
}

export async function getUserSnapshotById(userId: string) {
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
        coalesce(must_change_password, false) as must_change_password,
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

async function getUserPasswordRowById(userId: string) {
  if (!/^\d+$/.test(userId.trim())) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<UserPasswordRow>(
    `
      select
        id,
        hash
      from public.users
      where id = $1::bigint
      limit 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
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
        coalesce(must_change_password, false) as must_change_password,
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

export async function getUserByCognitoSub(sub: string) {
  const normalizedSub = sub.trim();
  if (!normalizedSub) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<SessionUserRow & { cognito_sub: string | null }>(
    `
      select
        id,
        email,
        role,
        username,
        name,
        photo,
        coalesce(must_change_password, false) as must_change_password,
        coalesce(platforms, array[]::varchar[]) as platforms,
        coalesce(innovacoin_roles, array[]::varchar[]) as innovacoin_roles,
        cognito_sub
      from public.users
      where cognito_sub = $1
      limit 1
    `,
    [normalizedSub],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return {
    session: mapSessionUser(user),
    cognitoSub: user.cognito_sub,
  };
}

export async function getUserWithCognitoByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<SessionUserRow & { cognito_sub: string | null }>(
    `
      select
        id,
        email,
        role,
        username,
        name,
        photo,
        coalesce(must_change_password, false) as must_change_password,
        coalesce(platforms, array[]::varchar[]) as platforms,
        coalesce(innovacoin_roles, array[]::varchar[]) as innovacoin_roles,
        cognito_sub
      from public.users
      where lower(coalesce(email, '')) = $1
      limit 1
    `,
    [normalizedEmail],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return {
    session: mapSessionUser(user),
    cognitoSub: user.cognito_sub,
  };
}

export async function linkCognitoSub(userId: string, sub: string) {
  const pool = getDbPool();
  await pool.query(
    `
      update public.users
      set
        cognito_sub = $2,
        auth_provider = case
          when auth_provider = 'LEGACY' then 'HYBRID'
          else auth_provider
        end,
        auth_migrated_at = coalesce(auth_migrated_at, now()),
        auth_last_sync_at = now(),
        must_change_password = false,
        updated_at = now()
      where id = $1::bigint
        and (cognito_sub is null or cognito_sub = $2)
    `,
    [userId, sub],
  );
}

export async function resolveUserFromCognitoIdentity(
  sub: string,
  email: string | null,
): Promise<LoginAttemptResult> {
  let resolved = await getUserByCognitoSub(sub);

  if (!resolved && email) {
    const byEmail = await getUserWithCognitoByEmail(email);
    if (byEmail) {
      if (byEmail.cognitoSub && byEmail.cognitoSub !== sub) {
        return {
          success: false,
          status: 403,
          error: "Identidade Cognito conflita com outro vínculo.",
        };
      }

      if (!byEmail.cognitoSub) {
        await linkCognitoSub(byEmail.session.id, sub);
        resolved = await getUserByCognitoSub(sub);
      } else {
        resolved = byEmail;
      }
    }
  }

  if (!resolved) {
    return {
      success: false,
      status: 403,
      error: "Usuário não vinculado ao Innova Coin.",
    };
  }

  // Cognito gerencia a senha: libera primeiro acesso legado se ainda estiver marcado.
  if (resolved.session.mustChangePassword) {
    const pool = getDbPool();
    await pool.query(
      `
        update public.users
        set
          must_change_password = false,
          updated_at = now()
        where id = $1::bigint
      `,
      [resolved.session.id],
    );
  }

  const user = {
    ...resolved.session,
    mustChangePassword: false,
  } satisfies SessionUser;

  const redirectTo = getPostLoginPath(user);

  if (!redirectTo) {
    return {
      success: false,
      status: 403,
      error: "Usuário sem acesso à plataforma.",
    };
  }

  return {
    success: true,
    redirectTo,
    user,
  };
}

export async function validateLoginAttempt(
  identifier: string,
  password: string,
): Promise<LoginAttemptResult> {
  if (!credentialsEnabled()) {
    return {
      success: false,
      status: 403,
      error: "Login por senha desabilitado. Use SSO.",
    };
  }

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

  const redirectTo = getPostLoginPath(user);

  if (!redirectTo) {
    return {
      success: false,
      status: 403,
      error: "Usuário sem acesso à plataforma.",
    };
  }

  return {
    success: true,
    redirectTo,
    user,
  };
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordAttemptResult> {
  const normalizedUserId = userId.trim();
  const normalizedCurrentPassword = currentPassword;
  const normalizedNewPassword = newPassword;

  if (!normalizedUserId) {
    return {
      success: false,
      status: 401,
      error: "Sessao invalida. Faca login novamente.",
    };
  }

  if (!normalizedCurrentPassword || !normalizedNewPassword) {
    return {
      success: false,
      status: 400,
      error: "Informe a senha atual e a nova senha.",
    };
  }

  if (normalizedCurrentPassword === normalizedNewPassword) {
    return {
      success: false,
      status: 400,
      error: "A nova senha deve ser diferente da senha atual.",
    };
  }

  const passwordErrors = getPasswordPolicyErrors(normalizedNewPassword);

  if (passwordErrors.length > 0) {
    return {
      success: false,
      status: 400,
      error: passwordErrors[0],
    };
  }

  const userPasswordRow = await getUserPasswordRowById(normalizedUserId);

  if (!userPasswordRow?.hash) {
    return {
      success: false,
      status: 401,
      error: "Sessao invalida. Faca login novamente.",
    };
  }

  const passwordMatches = await bcrypt.compare(
    normalizedCurrentPassword,
    userPasswordRow.hash,
  );

  if (!passwordMatches) {
    return {
      success: false,
      status: 400,
      error: "A senha atual esta incorreta.",
    };
  }

  const nextHash = await bcrypt.hash(normalizedNewPassword, 12);
  const pool = getDbPool();

  await pool.query(
    `
      update public.users
      set
        hash = $2,
        must_change_password = false,
        password_changed_at = now(),
        updated_at = now()
      where id = $1::bigint
    `,
    [normalizedUserId, nextHash],
  );

  const updatedUser = await getUserSnapshotById(normalizedUserId);

  if (!updatedUser) {
    return {
      success: false,
      status: 500,
      error: "Nao foi possivel atualizar a sessao do usuario.",
    };
  }

  return {
    success: true,
    redirectTo: getPostLoginPath(updatedUser) ?? LOGIN_PATH,
    user: updatedUser,
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
    mustChangePassword: user.mustChangePassword,
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
  brokerOrToken?: BrokerSessionFields | string,
  sessionToken?: string,
) {
  const broker =
    brokerOrToken && typeof brokerOrToken === "object" ? brokerOrToken : undefined;
  const token =
    typeof brokerOrToken === "string" ? brokerOrToken : sessionToken;
  const session = token ?? (await createSignedSessionToken(user, broker));
  const options = await getSessionCookieOptions();

  response.cookies.set(SESSION_COOKIE_NAME, session, options);

  debugAuth("session-cookie-attached", {
    userId: user.id,
    secure: options.secure,
    platforms: user.platforms,
    innovacoinRoles: user.innovacoinRoles,
    mustChangePassword: user.mustChangePassword,
    broker: Boolean(broker),
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
        mustChangePassword: latestUser.mustChangePassword,
      });
      return null;
    }

    debugAuth("session-loaded", {
      userId: latestUser.id,
      source: tokenFromCookie ? "cookie" : "authorization-header",
      platforms: latestUser.platforms,
      innovacoinRoles: latestUser.innovacoinRoles,
      mustChangePassword: latestUser.mustChangePassword,
    });
    return latestUser;
  } catch {
    debugAuth("session-invalid");
    return null;
  }
}

export async function requireAuthenticatedUser(
  options: RequireAuthenticatedUserOptions = {},
) {
  const user = await getSessionUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  if (user.mustChangePassword && !options.allowMustChangePassword) {
    redirect(FIRST_ACCESS_PATH);
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
