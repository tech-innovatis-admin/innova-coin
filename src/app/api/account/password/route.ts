import {
  changeUserPassword,
  getSessionUser,
  setSessionCookie,
} from "@/lib/auth";
import { jsonNoStore } from "../../auth/_lib/http";

type PasswordChangeRequestBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

function readStringField(
  body: PasswordChangeRequestBody,
  key: keyof PasswordChangeRequestBody,
) {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return jsonNoStore(
        {
          error: "Sessao expirada. Faca login novamente.",
        },
        {
          status: 401,
        },
      );
    }

    let body: PasswordChangeRequestBody;

    try {
      body = (await request.json()) as PasswordChangeRequestBody;
    } catch {
      return jsonNoStore(
        {
          error: "Envie currentPassword e newPassword em JSON.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await changeUserPassword(
      sessionUser.id,
      readStringField(body, "currentPassword"),
      readStringField(body, "newPassword"),
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

    const response = jsonNoStore({
      success: true,
      message: "Senha atualizada com sucesso.",
      redirectTo: result.redirectTo,
      user: result.user,
    });

    await setSessionCookie(response, result.user);

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao atualizar a senha.";

    return jsonNoStore(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
