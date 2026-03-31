"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createInstallmentAction,
  deleteInstallmentAction,
  getHeadInstallmentsAction,
  updateInstallmentAction,
} from "@/app/admin/actions";
import { formatCurrencyBRL } from "@/lib/formatters";
import type { HeadAccount, InstallmentEntry } from "@/lib/heads";
import UserAvatar from "../shared/user-avatar";

type AdminFormProps = {
  heads: HeadAccount[];
};

type BonusModalState = {
  head: HeadAccount;
  mode: "create" | "edit";
  installmentId: string | null;
  accumulatedAmount: string;
  cajuAmount: string;
  depositDate: string;
};

function formatBRLCurrencyInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(digitsOnly) / 100);
}

function splitHeadName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { firstName: name, lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function getTodayInputDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21H3v-4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AdminForm({ heads }: AdminFormProps) {
  const router = useRouter();
  const [bonusModal, setBonusModal] = useState<BonusModalState | null>(null);
  const [manageHead, setManageHead] = useState<HeadAccount | null>(null);
  const [manageInstallments, setManageInstallments] = useState<InstallmentEntry[]>([]);
  const [bonusFeedback, setBonusFeedback] = useState<string | null>(null);
  const [manageFeedback, setManageFeedback] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isLoadingManage, startLoadingManage] = useTransition();

  function openCreateBonusModal(head: HeadAccount) {
    setBonusFeedback(null);
    setBonusModal({
      head,
      mode: "create",
      installmentId: null,
      accumulatedAmount: "",
      cajuAmount: "",
      depositDate: getTodayInputDate(),
    });
  }

  function closeBonusModal() {
    if (isSubmitting) {
      return;
    }

    setBonusModal(null);
    setBonusFeedback(null);
  }

  function closeManageModal() {
    if (isSubmitting || isLoadingManage) {
      return;
    }

    setManageHead(null);
    setManageInstallments([]);
    setManageFeedback(null);
  }

  function loadHeadInstallments(head: HeadAccount) {
    setManageHead(head);
    setManageFeedback(null);

    startLoadingManage(async () => {
      const result = await getHeadInstallmentsAction(head.userId);

      if (result.error) {
        setManageFeedback(result.error);
        setManageInstallments([]);
        return;
      }

      setManageInstallments(result.installments ?? []);
    });
  }

  function openManageBonusModal(head: HeadAccount) {
    loadHeadInstallments(head);
  }

  function openInstallmentEditor(installment: InstallmentEntry) {
    if (!manageHead) {
      return;
    }

    setBonusFeedback(null);
    setBonusModal({
      head: manageHead,
      mode: "edit",
      installmentId: installment.id,
      accumulatedAmount: formatCurrencyBRL(installment.accumulatedAmount),
      cajuAmount: formatCurrencyBRL(installment.cajuAmount),
      depositDate: toDateInputValue(installment.addedAt),
    });
  }

  function updateBonusModal<K extends keyof BonusModalState>(
    field: K,
    value: BonusModalState[K],
  ) {
    setBonusModal((current) => (current ? { ...current, [field]: value } : current));
  }

  function submitBonusModal() {
    if (!bonusModal) {
      return;
    }

    startSubmitting(async () => {
      const formData = new FormData();

      if (bonusModal.mode === "edit") {
        formData.set("headId", bonusModal.head.userId);
        formData.set("installmentId", bonusModal.installmentId ?? "");
        formData.set("accumulatedAmount", bonusModal.accumulatedAmount);
        formData.set("cajuAmount", bonusModal.cajuAmount);
        formData.set("depositDate", bonusModal.depositDate);
      } else {
        formData.set("userId", bonusModal.head.userId);
        formData.set("accumulatedAmount", bonusModal.accumulatedAmount);
        formData.set("cajuAmount", bonusModal.cajuAmount);
        formData.set("depositDate", bonusModal.depositDate);
      }

      const result =
        bonusModal.mode === "edit"
          ? await updateInstallmentAction(undefined, formData)
          : await createInstallmentAction(undefined, formData);

      if (result?.error) {
        setBonusFeedback(result.error);
        return;
      }

      if (manageHead) {
        const refreshed = await getHeadInstallmentsAction(manageHead.userId);

        if (refreshed.installments) {
          setManageInstallments(refreshed.installments);
        }
      }

      setBonusModal(null);
      setBonusFeedback(null);
      router.refresh();
    });
  }

  function removeInstallment(headId: string, installmentId: string) {
    startSubmitting(async () => {
      if (!window.confirm("Deseja remover este bônus registrado?")) {
        return;
      }

      const formData = new FormData();
      formData.set("headId", headId);
      formData.set("installmentId", installmentId);

      await deleteInstallmentAction(formData);

      if (manageHead) {
        const refreshed = await getHeadInstallmentsAction(manageHead.userId);

        if (refreshed.error) {
          setManageFeedback(refreshed.error);
        } else {
          setManageInstallments(refreshed.installments ?? []);
        }
      }

      router.refresh();
    });
  }

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            Heads com acesso ao Innovacoin carregados do banco. Cadastre novos bônus
            e edite os registros sem sair desta tela.
          </p>
        </div>
      </section>

      {heads.length === 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Nenhum head encontrado
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Quando houver usuários com plataforma Innovacoin e role Head, eles aparecerão aqui.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {heads.map((head) => {
            const ready = head.status === "released";
            const waitingFirstDeposit = head.status === "awaiting_deposit";
            const { firstName, lastName } = splitHeadName(head.name);

            return (
              <article
                key={head.id}
                className="relative overflow-hidden rounded-[1.75rem] border border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(202,215,238,0.42))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.16),0_16px_36px_rgba(43,58,92,0.12)] ring-1 ring-white/30 backdrop-blur-md"
              >
                <div className="absolute inset-x-5 top-0 h-px bg-white/92" />
                <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
                <div className="absolute -right-10 -top-8 h-28 w-28 rounded-full bg-[#dce8ff]/28 blur-3xl" />
                <div className="absolute -bottom-12 left-2 h-28 w-28 rounded-full bg-[#6f87b7]/12 blur-3xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
                    <UserAvatar
                      name={head.name}
                      photoUrl={head.photoUrl}
                      size="md"
                      className="border-cyan-400/40 text-cyan-700"
                    />
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold leading-5 text-slate-950">
                        <span className="block truncate">{firstName}</span>
                        {lastName ? (
                          <span className="mt-0.5 block truncate">{lastName}</span>
                        ) : null}
                      </h2>
                      <p className="mt-1 truncate text-sm text-slate-500">{head.email}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-start">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        ready
                          ? "bg-emerald-300/30 text-emerald-800"
                          : waitingFirstDeposit
                            ? "bg-slate-300/35 text-slate-700"
                            : "bg-amber-300/30 text-amber-800"
                      }`}
                    >
                      {ready
                        ? "Liberado"
                        : waitingFirstDeposit
                          ? "Sem depósito"
                          : "Pendente"}
                    </span>
                    <Link
                      href={`/admin/heads/${head.userId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-700 transition hover:bg-cyan-500/20 hover:text-cyan-800"
                      aria-label={`Visualizar painel de ${head.name}`}
                    >
                      <EyeIcon />
                    </Link>
                  </div>
                </div>

                <div className="relative mt-5 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">
                      Acumulado
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">
                      {formatCurrencyBRL(head.pendingBalance)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">
                      Caju liberado
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">
                      {formatCurrencyBRL(head.cajuBalance)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">
                      Tempo restante
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {ready ? "Disponível agora" : head.remainingTimeLabel}
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => openCreateBonusModal(head)}
                    className="inline-flex min-w-[150px] justify-center rounded-2xl border border-[#08c9a5]/30 bg-[#08c9a5] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#07b694]"
                  >
                    Cadastrar bônus
                  </button>
                  <button
                    type="button"
                    onClick={() => openManageBonusModal(head)}
                    className="inline-flex min-w-[150px] justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Editar bônus
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {manageHead ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm"
          onClick={closeManageModal}
        >
          <div
            className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#111827] p-4 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/80">
                  Editar bônus
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {manageHead.name}
                </h2>
                <p className="mt-2 text-sm text-cyan-100/80">
                  Registros cadastrados para o acumulado e para o cartão Caju.
                </p>
              </div>

              <button
                type="button"
                onClick={closeManageModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/10"
                disabled={isSubmitting || isLoadingManage}
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            {manageFeedback ? (
              <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {manageFeedback}
              </p>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-white/10">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs uppercase tracking-[0.16em] text-cyan-100/70">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Acumulado</th>
                    <th className="px-4 py-3 font-semibold">Caju</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-white/[0.03] text-sm text-slate-100">
                  {isLoadingManage ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-300">
                        Carregando registros...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoadingManage && manageInstallments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-300">
                        Nenhum bônus cadastrado para este head.
                      </td>
                    </tr>
                  ) : null}

                  {!isLoadingManage &&
                    manageInstallments.map((installment) => (
                      <tr key={installment.id}>
                        <td className="px-4 py-3">{toDateInputValue(installment.addedAt)}</td>
                        <td className="px-4 py-3">
                          {formatCurrencyBRL(installment.accumulatedAmount)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrencyBRL(installment.cajuAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openInstallmentEditor(installment)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 transition hover:bg-cyan-500/20"
                              disabled={isSubmitting}
                              aria-label="Editar bônus"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeInstallment(manageHead.userId, installment.id)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/20"
                              disabled={isSubmitting}
                              aria-label="Remover bônus"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {bonusModal ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm"
          onClick={closeBonusModal}
        >
          <div
            className="w-full max-w-lg rounded-[1.5rem] border border-white/10 bg-[#111827] p-4 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/80">
                  {bonusModal.mode === "edit" ? "Editar bônus" : "Cadastrar bônus"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {bonusModal.head.name}
                </h2>
                <div className="mt-2 space-y-1 text-sm text-cyan-100/80">
                  <p>Saldo acumulado atual: {formatCurrencyBRL(bonusModal.head.pendingBalance)}</p>
                  <p>Total liberado no Caju: {formatCurrencyBRL(bonusModal.head.cajuBalance)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeBonusModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Valor acumulado
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={bonusModal.accumulatedAmount}
                  onChange={(event) =>
                    updateBonusModal(
                      "accumulatedAmount",
                      formatBRLCurrencyInput(event.target.value),
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm tabular-nums text-white outline-none transition placeholder:text-right focus:border-cyan-300/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Valor liberado no cartão Caju
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={bonusModal.cajuAmount}
                  onChange={(event) =>
                    updateBonusModal(
                      "cajuAmount",
                      formatBRLCurrencyInput(event.target.value),
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right text-sm tabular-nums text-white outline-none transition placeholder:text-right focus:border-cyan-300/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Data real do depósito
                </span>
                <input
                  type="date"
                  value={bonusModal.depositDate}
                  onChange={(event) =>
                    updateBonusModal("depositDate", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                O valor acumulado entra no ciclo de 5 anos. O valor do Caju fica liberado para uso imediato.
              </div>

              {bonusFeedback ? (
                <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {bonusFeedback}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeBonusModal}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitBonusModal}
                className="rounded-full bg-[#08c9a5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#07b694] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Salvando..."
                  : bonusModal.mode === "edit"
                    ? "Salvar edição"
                    : "Cadastrar bônus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
