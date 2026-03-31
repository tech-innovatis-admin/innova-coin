import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/platform-access";

export async function POST() {
  const response = NextResponse.json(
    {
      success: true,
      redirectTo: LOGIN_PATH,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  await clearSessionCookie(response);

  return response;
}
