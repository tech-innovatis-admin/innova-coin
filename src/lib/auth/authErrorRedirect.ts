import { NextRequest, NextResponse } from "next/server";

import { TRANSACTION_COOKIE } from "@/lib/auth/config";
import { resolveCookieSecure } from "@/lib/auth/cookieFlags";

export function buildAuthErrorRedirect(
  request: NextRequest,
  origin: string,
  code: string,
): NextResponse {
  const url = new URL("/auth/error", origin);
  url.searchParams.set("code", code);
  const response = NextResponse.redirect(url);
  response.cookies.set(TRANSACTION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: resolveCookieSecure(request.headers),
    path: "/",
    maxAge: 0,
  });
  return response;
}
