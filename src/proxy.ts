import { NextResponse, type NextRequest } from "next/server";

import { brokerEnabled } from "@/lib/auth/authMode";
import { validateBrokerSession } from "@/lib/auth/brokerIntrospection";
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

function shouldUseSecureCookie(request: NextRequest) {
  const configuredValue = process.env["AUTH_COOKIE_SECURE"]?.trim().toLowerCase();

  if (configuredValue === "true") {
    return true;
  }

  if (configuredValue === "false") {
    return false;
  }

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const host =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host ||
    "";

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return process.env.NODE_ENV === "production" && host !== "" && !isLocalHost(host);
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
        const active = await validateBrokerSession({
          ...brokerSession,
          auth: "broker",
        });
        if (!active) {
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
