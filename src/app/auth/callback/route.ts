import { NextRequest, NextResponse } from "next/server";

import {
  resolveUserFromCognitoIdentity,
  setSessionCookie,
} from "@/lib/auth";
import { cognitoEnabled } from "@/lib/authMode";
import {
  CognitoConfigError,
  cookieSecure,
  decodeOAuthCookie,
  exchangeCode,
  publicAppOrigin,
  verifyIdToken,
  buildLogoutUrl,
  isSilentAuthError,
  REAUTH_COOKIE,
  reauthCookieOptions,
} from "@/lib/cognitoOidc";
import { LOGIN_PATH } from "@/lib/platformAccess";
import { createSessionToken } from "@/lib/sessionToken";

const OAUTH_COOKIE = "innovacoin_oauth";

function appOrigin(request: NextRequest) {
  return publicAppOrigin(request);
}

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL(LOGIN_PATH, appOrigin(request));
  url.searchParams.set("sso_error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!cognitoEnabled()) {
    return NextResponse.json(
      { error: "SSO Cognito desabilitado." },
      { status: 404 },
    );
  }

  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    if (isSilentAuthError(error)) {
      const response = NextResponse.redirect(buildLogoutUrl());
      response.cookies.set(REAUTH_COOKIE, "1", reauthCookieOptions(120));
      response.cookies.set(OAUTH_COOKIE, "", reauthCookieOptions(0));
      return response;
    }
    return errorRedirect(request, "cognito_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return errorRedirect(request, "missing_code");
  }

  const rawCookie = request.cookies.get(OAUTH_COOKIE)?.value;
  if (!rawCookie) {
    return errorRedirect(request, "missing_oauth_cookie");
  }

  let oauth: { state?: string; nonce?: string; code_verifier?: string };
  try {
    oauth = decodeOAuthCookie(rawCookie);
  } catch {
    return errorRedirect(request, "invalid_oauth_cookie");
  }

  if (!oauth.state || oauth.state !== state || !oauth.nonce || !oauth.code_verifier) {
    return errorRedirect(request, "state_mismatch");
  }

  try {
    const tokens = await exchangeCode(code, oauth.code_verifier);
    const identity = await verifyIdToken(tokens.id_token, oauth.nonce);
    const result = await resolveUserFromCognitoIdentity(
      identity.sub,
      identity.email,
    );

    if (!result.success) {
      return errorRedirect(request, "user_not_linked");
    }

    const sessionToken = await createSessionToken(result.user);
    const response = NextResponse.redirect(
      new URL(result.redirectTo, appOrigin(request)),
    );
    await setSessionCookie(response, result.user, sessionToken);
    response.cookies.set(OAUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    if (err instanceof CognitoConfigError) {
      console.error("[auth/callback]", err.message);
    } else {
      console.error("[auth/callback]", err);
    }
    return errorRedirect(request, "callback_failed");
  }
}
