import { NextRequest, NextResponse } from "next/server";

import { brokerEnabled } from "@/lib/auth/authMode";
import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import { resolveCookieSecure } from "@/lib/auth/cookieFlags";
import { hubHomeUrl } from "@/lib/auth/hubHome";
import { publicAppOrigin } from "@/lib/auth/centralOidc";
import { LOGIN_PATH } from "@/lib/platformAccess";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";

function expireAuthCookies(response: NextResponse, request: NextRequest) {
  const secure = resolveCookieSecure(request.headers);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(SESSION_COOKIE_NAME, "", cookieOptions);
  response.cookies.set(TRANSACTION_COOKIE, "", cookieOptions);
}

export async function GET(request: NextRequest) {
  const origin = publicAppOrigin(request);
  const response = brokerEnabled()
    ? NextResponse.redirect(hubHomeUrl(), { status: 303 })
    : NextResponse.redirect(new URL(LOGIN_PATH, origin));

  expireAuthCookies(response, request);
  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
