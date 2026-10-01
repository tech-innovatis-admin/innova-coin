import { NextRequest, NextResponse } from "next/server";

import {
  CentralOidcConfigError,
  cookieSecure,
  decryptTransaction,
  exchangeCentralCallback,
  hasCentralPlatformAccess,
  publicAppOrigin,
  TRANSACTION_COOKIE,
} from "@/lib/auth/centralOidc";
import { safeReturnTo } from "@/lib/auth/redirectTarget";
import { getUserSnapshotById, setSessionCookie } from "@/lib/auth";
import { getPostLoginPath, LOGIN_PATH } from "@/lib/platformAccess";

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL(LOGIN_PATH, publicAppOrigin(request));
  url.searchParams.set("sso_error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return errorRedirect(request, "broker_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return errorRedirect(request, "missing_code");
  }

  const rawCookie = request.cookies.get(TRANSACTION_COOKIE)?.value;
  if (!rawCookie) {
    return errorRedirect(request, "missing_oauth_cookie");
  }

  const oauth = await decryptTransaction(rawCookie);
  if (!oauth) {
    return errorRedirect(request, "invalid_oauth_cookie");
  }

  if (oauth.state !== state) {
    return errorRedirect(request, "state_mismatch");
  }

  try {
    const identity = await exchangeCentralCallback({
      callbackUrl: request.nextUrl,
      expectedState: oauth.state,
      expectedNonce: oauth.nonce,
      codeVerifier: oauth.code_verifier,
    });

    if (!hasCentralPlatformAccess(identity)) {
      return errorRedirect(request, "user_not_linked");
    }

    if (!identity.userId) {
      return errorRedirect(request, "user_not_linked");
    }

    const dbUser = await getUserSnapshotById(String(identity.userId));
    if (!dbUser) {
      return errorRedirect(request, "user_not_linked");
    }

    const postLogin = getPostLoginPath(dbUser);
    if (!postLogin) {
      return errorRedirect(request, "user_not_linked");
    }

    const response = NextResponse.redirect(
      new URL(
        safeReturnTo(oauth.returnTo, postLogin),
        publicAppOrigin(request),
      ),
    );
    await setSessionCookie(response, dbUser, {
      sid: identity.sid,
      authz_version: identity.authzVersion,
      sub: identity.sub,
    });
    response.cookies.set(TRANSACTION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(request.headers),
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error(
      "[auth/callback]",
      err instanceof CentralOidcConfigError ? err.message : err,
    );
    return errorRedirect(request, "callback_failed");
  }
}
