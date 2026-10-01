import { NextResponse, type NextRequest } from "next/server";

import { brokerEnabled } from "@/lib/auth/authMode";
import { validateBrokerSession } from "@/lib/auth/brokerIntrospection";
import { resolveCookieSecure } from "@/lib/auth/cookieFlags";
import { getDbPool } from "@/lib/db";
import { getRedirectTargetForPathname } from "@/lib/platformAccess";
import {
  createSessionTokenFromTokenUser,
  readBrokerFieldsFromToken,
  readSessionUserStateFromToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  type SessionTokenUser,
} from "@/lib/sessionToken";

type ProxySessionUserState = {
  user: SessionTokenUser | null;
  refreshedToken: string | null;
};

type ProxyPasswordStateRow = {
  must_change_password: boolean | null;
};

function shouldUseSecureCookie(request: NextRequest) {
  return resolveCookieSecure(request.headers);
}

function attachSessionCookie(
  response: NextResponse,
  request: NextRequest,
  sessionToken: string,
) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

function clearSessionCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 0,
  });
}

async function readMustChangePasswordByUserId(userId: string) {
  if (!/^\d+$/.test(userId.trim())) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<ProxyPasswordStateRow>(
    `
      select
        coalesce(must_change_password, false) as must_change_password
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

  return user.must_change_password === true;
}

async function readProxySessionUser(request: NextRequest): Promise<ProxySessionUserState> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return {
      user: null,
      refreshedToken: null,
    };
  }

  try {
    if (brokerEnabled()) {
      const brokerSession = await readBrokerFieldsFromToken(token);
      if (brokerSession) {
        if (
          (await validateBrokerSession({
            ...brokerSession,
            auth: "broker",
          })) !== "active"
        ) {
          return {
            user: null,
            refreshedToken: null,
          };
        }
      }
    }

    const sessionState = await readSessionUserStateFromToken(token);
    const brokerFields = await readBrokerFieldsFromToken(token);

    if (sessionState.hasMustChangePasswordClaim) {
      return {
        user: sessionState.user,
        refreshedToken: null,
      };
    }

    // Legacy sessions created before `mustChangePassword` was added need one
    // server-side refresh so Proxy can keep redirect behavior in sync.
    const mustChangePassword = await readMustChangePasswordByUserId(sessionState.user.id);

    if (mustChangePassword === null) {
      return {
        user: sessionState.user,
        refreshedToken: null,
      };
    }

    const refreshedUser = {
      ...sessionState.user,
      mustChangePassword,
    } satisfies SessionTokenUser;

    return {
      user: refreshedUser,
      refreshedToken: await createSessionTokenFromTokenUser(
        refreshedUser,
        brokerFields ?? undefined,
      ),
    };
  } catch {
    return {
      user: null,
      refreshedToken: null,
    };
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/auth/login" || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const sessionState = await readProxySessionUser(request);
  const redirectTo = getRedirectTargetForPathname(sessionState.user, pathname);

  const response =
    redirectTo && redirectTo !== pathname
      ? NextResponse.redirect(new URL(redirectTo, request.url))
      : NextResponse.next();

  if (sessionState.refreshedToken) {
    attachSessionCookie(response, request, sessionState.refreshedToken);
  } else if (!sessionState.user && request.cookies.get(SESSION_COOKIE_NAME)?.value) {
    clearSessionCookie(response, request);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*$).*)"],
};
