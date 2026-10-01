import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";

import { brokerEnabled, centralOidcConfigured } from "@/lib/auth/authMode";
import {
  buildCentralAuthorizeUrl,
  CentralOidcConfigError,
  cookieSecure,
  encryptTransaction,
  publicAppOrigin,
  TRANSACTION_COOKIE,
  TRANSACTION_MAX_AGE,
} from "@/lib/auth/centralOidc";
import { safeReturnTo } from "@/lib/auth/redirectTarget";
import { ADMIN_HOME_PATH, LOGIN_PATH } from "@/lib/platformAccess";

function sessionCookieOptions(request: NextRequest, maxAge = 0) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(request.headers),
    path: "/",
    maxAge,
  };
}

export async function GET(request: NextRequest) {
  if (!brokerEnabled() || !centralOidcConfigured()) {
    return NextResponse.redirect(new URL(LOGIN_PATH, publicAppOrigin(request)));
  }

  try {
    const returnTo = safeReturnTo(
      request.nextUrl.searchParams.get("returnTo"),
      ADMIN_HOME_PATH,
    );

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();
    const authorizeUrl = await buildCentralAuthorizeUrl({
      state,
      nonce,
      codeChallenge,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(
      TRANSACTION_COOKIE,
      await encryptTransaction({
        state,
        nonce,
        code_verifier: codeVerifier,
        returnTo,
      }),
      sessionCookieOptions(request, TRANSACTION_MAX_AGE),
    );
    return response;
  } catch (error) {
    const message =
      error instanceof CentralOidcConfigError
        ? error.message
        : "Falha ao iniciar SSO.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
