import { getSessionUser } from "@/lib/auth";
import { getPostLoginPath, LOGIN_PATH } from "@/lib/platform-access";
import { jsonNoStore } from "../_lib/http";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return jsonNoStore(
      {
        authenticated: false,
        user: null,
        redirectTo: LOGIN_PATH,
      },
      {
        status: 401,
      },
    );
  }

  return jsonNoStore(
    {
      authenticated: true,
      user,
      redirectTo: getPostLoginPath(user),
    },
  );
}
