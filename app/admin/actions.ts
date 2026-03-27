"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth";
import {
  addInstallmentToHead,
  updateHeadProfile,
  updateHeadReleaseSettings,
  type WithdrawStatus,
} from "@/lib/heads";
import { deleteInstallmentById, updateInstallmentById } from "@/lib/installments";

export type SaveHeadActionResult = {
  error?: string;
  success?: true;
};

export type EditInstallmentActionResult = {
  error?: string;
  success?: true;
};

export async function saveHeadAction(
  _previousState: SaveHeadActionResult | undefined,
  formData: FormData,
) {
  await requireAdminUser();

  const userId = String(formData.get("userId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const photoUrlValue = String(formData.get("photoUrl") ?? "").trim();
  const installmentValue = String(formData.get("newInstallment") ?? "").trim();
  const availableAt = String(formData.get("availableAt") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as WithdrawStatus;

  if (!userId) {
    return { error: "Usuario invalido." } satisfies SaveHeadActionResult;
  }

  if (!name) {
    return { error: "Informe o nome do head." } satisfies SaveHeadActionResult;
  }

  const installmentAmount =
    installmentValue === "" ? 0 : Number(installmentValue.replace(",", "."));

  if (Number.isNaN(installmentAmount) || installmentAmount < 0) {
    return {
      error: "Informe um valor de parcela valido.",
    } satisfies SaveHeadActionResult;
  }

  if (!availableAt) {
    return {
      error: "Informe a liberacao estimada.",
    } satisfies SaveHeadActionResult;
  }

  if (status !== "pending" && status !== "released") {
    return {
      error: "Informe um status valido.",
    } satisfies SaveHeadActionResult;
  }

  await updateHeadProfile({
    userId,
    name,
    email,
    photoUrl: photoUrlValue || null,
  });

  await updateHeadReleaseSettings({
    userId,
    availableAt: new Date(availableAt).toISOString(),
    status,
  });

  if (installmentAmount > 0) {
    await addInstallmentToHead({
      userId,
      amount: installmentAmount,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath(`/admin/heads/${userId}`);

  return { success: true } satisfies SaveHeadActionResult;
}

export async function updateInstallmentAction(
  _previousState: EditInstallmentActionResult | undefined,
  formData: FormData,
) {
  await requireAdminUser();

  const headId = String(formData.get("headId") ?? "").trim();
  const installmentId = String(formData.get("installmentId") ?? "").trim();
  const amountValue = String(formData.get("amount") ?? "").trim();
  const depositDate = String(formData.get("depositDate") ?? "").trim();

  if (!headId || !installmentId) {
    return { error: "Parcela invalida." } satisfies EditInstallmentActionResult;
  }

  const amount = Number(amountValue.replace(",", "."));

  if (Number.isNaN(amount) || amount < 0) {
    return { error: "Informe um valor valido." } satisfies EditInstallmentActionResult;
  }

  if (!depositDate) {
    return { error: "Informe a data do deposito." } satisfies EditInstallmentActionResult;
  }

  await updateInstallmentById({
    installmentId,
    amount,
    depositDate,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/admin/heads/${headId}`);

  return { success: true } satisfies EditInstallmentActionResult;
}

export async function deleteInstallmentAction(formData: FormData) {
  await requireAdminUser();

  const headId = String(formData.get("headId") ?? "").trim();
  const installmentId = String(formData.get("installmentId") ?? "").trim();

  if (!headId || !installmentId) {
    return;
  }

  await deleteInstallmentById(installmentId);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/admin/heads/${headId}`);
}
