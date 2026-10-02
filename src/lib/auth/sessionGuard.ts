import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { brokerEnabled, brokerOnly, unauthenticatedLoginPath } from "@/lib/auth/authMode";
import {
  readBrokerSessionFromPayload,
  validateBrokerSession,
  type BrokerSessionState,
} from "@/lib/auth/brokerIntrospection";
import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import { resolveCookieSecure } from "@/lib/auth/cookieFlags";
import { safeReturnTo } from "@/lib/auth/redirectTarget";
import { readSessionPayload, SESSION_COOKIE_NAME } from "@/lib/sessionToken";

export const UNAVAILABLE_RETRY_AFTER_SECONDS = 30;

export type SessionDecision = {
  state: BrokerSessionState;
  hadCookie: boolean;
};

export function isApiRequest(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isClientNavigationRequest(request: NextRequest): boolean {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.has("next-action")
  );
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function getBearerTokenFromAuthorizationHeader(
  authorizationHeader: string | null,
): string | null {
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

function readSessionToken(request: NextRequest): { token: string | null; hadCookie: boolean } {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    return { token: cookieToken, hadCookie: true };
  }

  const bearer = getBearerTokenFromAuthorizationHeader(request.headers.get("authorization"));
  return { token: bearer, hadCookie: false };
}

export async function evaluateSession(
  request: NextRequest,
  fetcher: typeof fetch = fetch,
): Promise<SessionDecision> {
  const { token, hadCookie } = readSessionToken(request);
  if (!token) {
    return { state: "inactive", hadCookie: false };
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await readSessionPayload(token)) as Record<string, unknown>;
  } catch {
    return { state: "inactive", hadCookie };
  }

  if (!brokerEnabled()) {
    return { state: "active", hadCookie };
  }

  const brokerSession = readBrokerSessionFromPayload(payload);
  if (!brokerSession) {
    if (brokerOnly() || payload.auth === "broker") {
      return { state: "inactive", hadCookie };
    }
    return { state: "active", hadCookie };
  }

  let state: BrokerSessionState;
  try {
    state = await validateBrokerSession(brokerSession, fetcher);
  } catch (error) {
    console.error("[auth] validacao de sessao broker indisponivel", errorName(error));
    return { state: "unavailable", hadCookie };
  }

  return { state, hadCookie };
}

function expiredCookieOptions(headers: Headers) {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(headers),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function expireSessionCookies<T extends NextResponse>(
  response: T,
  headers: Headers,
): T {
  const options = expiredCookieOptions(headers);
  response.cookies.set(SESSION_COOKIE_NAME, "", options);
  response.cookies.set(TRANSACTION_COOKIE, "", options);
  return response;
}

function withExpiredSessionCookiesIfNeeded<T extends NextResponse>(
  response: T,
  hadCookie: boolean,
  headers: Headers,
): T {
  return hadCookie ? expireSessionCookies(response, headers) : response;
}

export function renderUnavailableHtml(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Login temporariamente indisponível</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#e2e8f0;font-family:system-ui,-apple-system,Segoe UI,sans-serif">
    <main style="max-width:28rem;padding:2rem;text-align:center">
      <h1 style="margin:0 0 .75rem;font-size:1.5rem">O login está temporariamente indisponível</h1>
      <p style="margin:0 0 1.5rem;color:#94a3b8">Tente novamente em alguns instantes. Sua sessão não foi encerrada.</p>
      <a href="" style="display:inline-block;padding:.6rem 1.1rem;border-radius:.5rem;background:#0891b2;color:#fff;text-decoration:none">Tentar novamente</a>
    </main>
  </body>
</html>`;
}

function inactivePageResponse(
  request: NextRequest,
  returnTo: string,
  hadCookie: boolean,
): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = unauthenticatedLoginPath();
  loginUrl.search = "";
  loginUrl.searchParams.set("returnTo", returnTo);
  return withExpiredSessionCookiesIfNeeded(
    NextResponse.redirect(loginUrl, { status: 303 }),
    hadCookie,
    request.headers,
  );
}

function inactiveApiResponse(request: NextRequest, hadCookie: boolean): NextResponse {
  return withExpiredSessionCookiesIfNeeded(
    NextResponse.json(
      { error: "session_inactive" },
      { status: 401, headers: { "cache-control": "no-store" } },
    ),
    hadCookie,
    request.headers,
  );
}

function inactiveClientNavigationResponse(
  request: NextRequest,
  hadCookie: boolean,
): NextResponse {
  return withExpiredSessionCookiesIfNeeded(
    new NextResponse("session_inactive", {
      status: 401,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
    hadCookie,
    request.headers,
  );
}

export function unavailablePageResponse(): NextResponse {
  return new NextResponse(renderUnavailableHtml(), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(UNAVAILABLE_RETRY_AFTER_SECONDS),
      "cache-control": "no-store",
    },
  });
}

function unavailableApiResponse(): NextResponse {
  return NextResponse.json(
    { error: "auth_unavailable" },
    {
      status: 503,
      headers: {
        "retry-after": String(UNAVAILABLE_RETRY_AFTER_SECONDS),
        "cache-control": "no-store",
      },
    },
  );
}

/** Devolve `null` quando a requisição pode seguir. */
export async function guardRequest(
  request: NextRequest,
  fetcher: typeof fetch = fetch,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const api = isApiRequest(pathname);
  const { state, hadCookie } = await evaluateSession(request, fetcher);

  if (state === "active") {
    return null;
  }

  if (state === "unavailable") {
    return api ? unavailableApiResponse() : unavailablePageResponse();
  }

  if (api) {
    return inactiveApiResponse(request, hadCookie);
  }

  if (isClientNavigationRequest(request)) {
    return inactiveClientNavigationResponse(request, hadCookie);
  }

  return inactivePageResponse(request, safeReturnTo(pathname, "/admin"), hadCookie);
}
