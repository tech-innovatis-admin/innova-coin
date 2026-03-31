import { clearSessionCookie } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/platform-access";
import { jsonNoStore } from "../_lib/http";

export async function POST() {
  const response = jsonNoStore(
    {
      success: true,
      redirectTo: LOGIN_PATH,
    },
  );

  await clearSessionCookie(response);

  return response;
}
