import { NextResponse } from "next/server";

import { setSessionCookie, validateLoginAttempt } from "@/lib/auth";
import {
  createSessionToken,
  SESSION_DURATION_SECONDS,
} from "@/lib/session-token";

type LoginRequestBody = {
  identifier?: unknown;
  password?: unknown;
};

function readStringField(
  body: LoginRequestBody,
  field: "identifier" | "password",
) {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

async function extractCredentials(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    return {
      identifier: String(formData.get("identifier") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      identifier: String(formData.get("identifier") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
  }

  const textBody = await request.text();

  if (!textBody.trim()) {
    return {
      identifier: "",
      password: "",
    };
  }

  try {
    const body = JSON.parse(textBody) as LoginRequestBody;
    return {
      identifier: readStringField(body, "identifier"),
      password: readStringField(body, "password"),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const credentials = await extractCredentials(request);

  if (!credentials) {
    return NextResponse.json(
      {
        error: "Envie identifier e password em JSON, form-data ou x-www-form-urlencoded.",
      },
      {
        status: 415,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const result = await validateLoginAttempt(
    credentials.identifier,
    credentials.password,
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
      },
      {
        status: result.status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const token = await createSessionToken(result.user);
  const response = NextResponse.json(
    {
      success: true,
      token,
      tokenType: "Bearer",
      expiresIn: SESSION_DURATION_SECONDS,
      redirectTo: result.redirectTo,
      user: result.user,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  await setSessionCookie(response, result.user, token);

  return response;
}
