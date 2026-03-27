"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteInstallmentAction,
  updateInstallmentAction,
} from "@/app/admin/actions";
import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";
import type { DashboardUser, InstallmentEntry } from "@/lib/heads";
import HeadDashboardPanel from "./head-dashboard-panel";

type AdminHeadViewProps = {
  headId: string;
  user: DashboardUser;
};

type InstallmentDraft = {
  amount: string;
  depositDate: string;
};

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

export default function AdminHeadView({ headId, user }: AdminHeadViewProps) {
  const router = useRouter();
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InstallmentDraft | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedInstallments = useMemo(
    () =>
      [...user.installments].sort(
        (firstInstallment, secondInstallment) =>
          new Date(secondInstallment.addedAt).getTime() -
          new Date(firstInstallment.addedAt).getTime(),
      ),
    [user.installments],
  );

  function startEditing(installment: InstallmentEntry) {
    setEditingInstallmentId(installment.id);
    setFeedback(null);
    setDraft({
      amount: String(installment.amount),
      depositDate: toDateInputValue(installment.addedAt),
    });
  }

  function cancelEditing() {
    if (isPending) {
      return;
    }

    setEditingInstallmentId(null);
    setDraft(null);
    setFeedback(null);
  }

  function saveInstallment() {
    if (!editingInstallmentId || !draft) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("headId", headId);
      formData.set("installmentId", editingInstallmentId);
      formData.set("amount", draft.amount);
      formData.set("depositDate", draft.depositDate);

      const result = await updateInstallmentAction(undefined, formData);

      if (result?.error) {
        setFeedback(result.error);
        return;
      }

      cancelEditing();
      router.refresh();
    });
  }

  function removeInstallment(installmentId: string) {
    startTransition(async () => {
      if (!window.confirm("Deseja remover esta parcela do extrato?")) {
        return;
      }

      const formData = new FormData();
      formData.set("headId", headId);
      formData.set("installmentId", installmentId);

      await deleteInstallmentAction(formData);
      cancelEditing();
      router.refresh();
    });
  }

  return (
    <>
      <HeadDashboardPanel
        user={user}
        heading={`${user.name}`}
        intro="Você está vendo o mesmo painel do head, com controles extras de administracao logo abaixo."
      />

      <section className="-mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-cyan-700">
              Gestao do extrato
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Editar ou remover parcelas
            </h2>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Total atual: {formatCurrencyBRL(user.pendingBalance)}
          </div>
        </div>

        {feedback ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {feedback}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {sortedInstallments.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Nenhuma parcela registrada para este head.
            </div>
          ) : null}

          {sortedInstallments.map((installment) => {
            const isEditing = installment.id === editingInstallmentId;

            return (
              <article
                key={installment.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                {isEditing && draft ? (
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Valor</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.amount}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, amount: event.target.value }
                              : current,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Data</span>
                      <input
                        type="date"
                        value={draft.depositDate}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, depositDate: event.target.value }
                              : current,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveInstallment}
                        className="rounded-full bg-[#08c9a5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#07b694] disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isPending}
                      >
                        {isPending ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-cyan-700">
                        Parcela
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatCurrencyBRL(installment.amount)}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Depositada em {formatDateBR(installment.addedAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(installment)}
                        className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInstallment(installment.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
