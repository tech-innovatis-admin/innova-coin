import { setSessionCookie, validateLoginAttempt } from "@/lib/auth";
import {
  createSessionToken,
  SESSION_DURATION_SECONDS,
} from "@/lib/sessionToken";
import { jsonNoStore } from "../_lib/http";
import { extractLoginCredentials } from "../_lib/loginRequest";

export async function POST(request: Request) {
  const credentials = await extractLoginCredentials(request);

  if (!credentials) {
    return jsonNoStore(
      {
        error: "Envie identifier e password em JSON, form-data ou x-www-form-urlencoded.",
      },
      {
        status: 415,
      },
    );
  }

  const result = await validateLoginAttempt(
    credentials.identifier,
    credentials.password,
  );

  if (!result.success) {
    return jsonNoStore(
      {
        error: result.error,
      },
      {
        status: result.status,
      },
    );
  }

  const token = await createSessionToken(result.user);
  const response = jsonNoStore(
    {
      success: true,
      token,
      tokenType: "Bearer",
      expiresIn: SESSION_DURATION_SECONDS,
      redirectTo: result.redirectTo,
      user: result.user,
    },
  );

  await setSessionCookie(response, result.user, token);

  return response;
}
