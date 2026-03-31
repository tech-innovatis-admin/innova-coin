import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getPostLoginPath, LOGIN_PATH } from "@/lib/platform-access";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        redirectTo: LOGIN_PATH,
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user,
      redirectTo: getPostLoginPath(user),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
