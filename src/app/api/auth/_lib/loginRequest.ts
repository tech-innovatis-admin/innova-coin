type LoginRequestBody = {
  identifier?: unknown;
  password?: unknown;
};

type LoginCredentials = {
  identifier: string;
  password: string;
};

function readStringField(
  body: LoginRequestBody,
  field: keyof LoginCredentials,
) {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

function readCredentialsFromFormData(formData: FormData): LoginCredentials {
  return {
    identifier: String(formData.get("identifier") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

export async function extractLoginCredentials(
  request: Request,
): Promise<LoginCredentials | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return readCredentialsFromFormData(await request.formData());
  }

  if (contentType.includes("multipart/form-data")) {
    return readCredentialsFromFormData(await request.formData());
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
