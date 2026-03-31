"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth";
import { addInstallmentToHead, type InstallmentEntry } from "@/lib/heads";
import {
  deleteInstallmentById,
  getInstallmentsByUserId,
  mapInstallments,
  updateInstallmentById,
} from "@/lib/installments";

export type InstallmentActionResult = {
  error?: string;
  success?: true;
};

export type LoadHeadInstallmentsActionResult = {
  error?: string;
  installments?: InstallmentEntry[];
};

function parseCurrencyInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  const normalizedValue = trimmedValue.replace(/\s/g, "");
  const sanitizedValue = normalizedValue.replace(/[^\d,.-]/g, "");

  if (!sanitizedValue) {
    return Number.NaN;
  }

  if (sanitizedValue.includes(",")) {
    return Number(sanitizedValue.replace(/\./g, "").replace(",", "."));
  }

  return Number(sanitizedValue);
}

function isValidInputDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
    return { error: "Head inválido." };
  }

  const rows = await getInstallmentsByUserId(userId);

  return {
    installments: mapInstallments(rows),
  };
}

export async function createInstallmentAction(
  _previousState: InstallmentActionResult | undefined,
  formData: FormData,
) {
  await requireAdminUser();

  const userId = String(formData.get("userId") ?? "").trim();
  const accumulatedValue = String(formData.get("accumulatedAmount") ?? "").trim();
  const cajuValue = String(formData.get("cajuAmount") ?? "").trim();
  const depositDate = String(formData.get("depositDate") ?? "").trim();

  if (!userId) {
    return { error: "Head inválido." } satisfies InstallmentActionResult;
  }

  const accumulatedAmount = parseCurrencyInput(accumulatedValue);
  const cajuAmount = parseCurrencyInput(cajuValue);

  if (Number.isNaN(accumulatedAmount) || accumulatedAmount < 0) {
    return {
      error: "Informe um valor válido para o acumulado.",
    } satisfies InstallmentActionResult;
  }

  if (Number.isNaN(cajuAmount) || cajuAmount < 0) {
    return {
      error: "Informe um valor válido para o cartão Caju.",
    } satisfies InstallmentActionResult;
  }

  if (accumulatedAmount <= 0 && cajuAmount <= 0) {
    return {
      error: "Informe pelo menos um valor para o bônus.",
    } satisfies InstallmentActionResult;
  }

  if (!depositDate || !isValidInputDate(depositDate)) {
    return {
      error: "Informe a data real do depósito.",
    } satisfies InstallmentActionResult;
  }

  await addInstallmentToHead({
    userId,
    accumulatedAmount,
    cajuAmount,
    depositDate,
  });

  revalidateHeadPaths(userId);

  return { success: true } satisfies InstallmentActionResult;
}

export async function updateInstallmentAction(
  _previousState: InstallmentActionResult | undefined,
  formData: FormData,
) {
  await requireAdminUser();

  const headId = String(formData.get("headId") ?? "").trim();
  const installmentId = String(formData.get("installmentId") ?? "").trim();
  const accumulatedValue = String(formData.get("accumulatedAmount") ?? "").trim();
  const cajuValue = String(formData.get("cajuAmount") ?? "").trim();
  const depositDate = String(formData.get("depositDate") ?? "").trim();

  if (!headId || !installmentId) {
    return { error: "Parcela inválida." } satisfies InstallmentActionResult;
  }

  const accumulatedAmount = parseCurrencyInput(accumulatedValue);
  const cajuAmount = parseCurrencyInput(cajuValue);

  if (Number.isNaN(accumulatedAmount) || accumulatedAmount < 0) {
    return {
      error: "Informe um valor válido para o acumulado.",
    } satisfies InstallmentActionResult;
  }

  if (Number.isNaN(cajuAmount) || cajuAmount < 0) {
    return {
      error: "Informe um valor válido para o cartão Caju.",
    } satisfies InstallmentActionResult;
  }

  if (accumulatedAmount <= 0 && cajuAmount <= 0) {
    return {
      error: "Informe pelo menos um valor para o bônus.",
    } satisfies InstallmentActionResult;
  }

  if (!depositDate || !isValidInputDate(depositDate)) {
    return {
      error: "Informe a data real do depósito.",
    } satisfies InstallmentActionResult;
  }

  await updateInstallmentById({
    installmentId,
    accumulatedAmount,
    cajuAmount,
    depositDate,
  });

  revalidateHeadPaths(headId);

  return { success: true } satisfies InstallmentActionResult;
}

export async function deleteInstallmentAction(formData: FormData) {
  await requireAdminUser();

  const headId = String(formData.get("headId") ?? "").trim();
  const installmentId = String(formData.get("installmentId") ?? "").trim();

  if (!headId || !installmentId) {
    return;
  }

  await deleteInstallmentById(installmentId);
  revalidateHeadPaths(headId);
}
