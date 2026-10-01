import { NextRequest, NextResponse } from "next/server";

import { brokerEnabled, centralOidcConfigured } from "@/lib/auth/authMode";
import {
  buildCentralLogoutUrl,
  cookieSecure,
  publicAppOrigin,
  TRANSACTION_COOKIE,
} from "@/lib/auth/centralOidc";
import { LOGIN_PATH } from "@/lib/platformAccess";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";

export async function GET(request: NextRequest) {
  const origin = publicAppOrigin(request);
  const response = NextResponse.redirect(
    brokerEnabled() && centralOidcConfigured()
      ? buildCentralLogoutUrl(`${origin}${LOGIN_PATH}`)
      : new URL(LOGIN_PATH, origin),
  );

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request.headers),
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(TRANSACTION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request.headers),
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
