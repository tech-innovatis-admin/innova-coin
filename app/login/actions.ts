"use server";

import { redirect } from "next/navigation";

import {
  authenticateUser,
  createSession,
  deleteSession,
} from "@/lib/auth";
import { getPostLoginPath } from "@/lib/platform-access";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginActionState | undefined,
  formData: FormData,
) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return {
      error: "Informe usuario/e-mail e senha.",
    } satisfies LoginActionState;
  }

  const user = await authenticateUser(identifier, password);

  if (!user) {
    return {
      error: "Credenciais invalidas.",
    } satisfies LoginActionState;
  }

  const postLoginPath = getPostLoginPath(user.id);

  if (!postLoginPath) {
    return {
      error: "Usuario sem acesso a esta plataforma.",
    } satisfies LoginActionState;
  }

  await createSession(user);

  redirect(postLoginPath);
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
