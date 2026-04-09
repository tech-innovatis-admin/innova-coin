"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth";
import type { InstallmentEntry } from "@/lib/heads";
import { getInstallmentsByUserId, mapInstallments } from "@/lib/installments";

export type InstallmentActionResult = {
  error?: string;
  success?: true;
};

export type LoadHeadInstallmentsActionResult = {
  error?: string;
  installments?: InstallmentEntry[];
};

function revalidateHeadPaths(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath(`/admin/heads/${userId}`);
}

export async function getHeadInstallmentsAction(
  userId: string,
): Promise<LoadHeadInstallmentsActionResult> {
  await requireAdminUser();

  if (!userId) {
    return { error: "Usuário inválido." };
  }

  const rows = await getInstallmentsByUserId(userId);

  return {
    installments: mapInstallments(rows),
  };
}

export async function createInstallmentAction() {
  await requireAdminUser();
  return {
    error: "Cadastro manual desativado. Os valores são carregados pela planilha.",
  } satisfies InstallmentActionResult;
}

export async function updateInstallmentAction() {
  await requireAdminUser();
  return {
    error: "Edição manual desativada. Os valores são carregados pela planilha.",
  } satisfies InstallmentActionResult;
}

export async function deleteInstallmentAction(formData: FormData) {
  await requireAdminUser();

  const headId = String(formData.get("headId") ?? "").trim();

  if (!headId) {
    return;
  }

  revalidateHeadPaths(headId);
}
