import { NextResponse, type NextRequest } from "next/server";

import { getRedirectTargetForPathname } from "@/lib/platformAccess";
import {
  readSessionUserFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/sessionToken";

async function readProxySessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await readSessionUserFromToken(token);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionUser = await readProxySessionUser(request);
  const redirectTo = getRedirectTargetForPathname(sessionUser, pathname);

  if (!redirectTo) {
    return NextResponse.next();
  }

  if (redirectTo === pathname) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*$).*)"],
};
