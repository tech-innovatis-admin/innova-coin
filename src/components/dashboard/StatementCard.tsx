"use client";

import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";
import type { InstallmentEntry } from "@/lib/heads";

type StatementCardProps = {
  installments: InstallmentEntry[];
};

function InstallmentIcon() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v18" />
        <path d="M16.5 7.5C15.7 6.6 14.3 6 12.7 6h-1.4C9.5 6 8 7.1 8 8.5S9.5 11 11.3 11h1.4C14.5 11 16 12.1 16 13.5S14.5 16 12.7 16h-1.4c-1.6 0-3-.6-3.8-1.5" />
      </svg>
      <svg
        viewBox="0 0 12 12"
        className="absolute right-[5px] top-[5px] h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 10V2" />
        <path d="M3 5l3-3 3 3" />
      </svg>
    </div>
  );
}

export default function StatementCard({ installments }: StatementCardProps) {
  const accumulatedInstallments = [...installments]
    .filter((installment) => installment.accumulatedAmount > 0)
    .sort(
      (firstInstallment, secondInstallment) =>
        new Date(secondInstallment.addedAt).getTime() -
        new Date(firstInstallment.addedAt).getTime(),
    );
  const hasInstallments = accumulatedInstallments.length > 0;

  return (
    <article
      className={`relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[1.6rem] border p-4 ring-1 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 sm:min-h-[390px] sm:rounded-[2rem] sm:p-5 xl:min-h-[420px] xl:p-6 ${
        hasInstallments
          ? "border-emerald-100/65 bg-[linear-gradient(145deg,rgba(244,248,255,0.82),rgba(219,242,232,0.52))] shadow-[inset_0_1px_0_rgba(255,255,255,0.90),inset_0_-1px_0_rgba(130,151,189,0.14),0_22px_54px_rgba(16,185,129,0.12)] ring-white/42 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.94),inset_0_-1px_0_rgba(130,151,189,0.16),0_28px_66px_rgba(16,185,129,0.16)]"
          : "border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.76),rgba(216,229,248,0.46))] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),inset_0_-1px_0_rgba(130,151,189,0.16),0_18px_42px_rgba(43,58,92,0.10)] ring-white/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(130,151,189,0.18),0_24px_56px_rgba(43,58,92,0.14)]"
      }`}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-white/92" />
      <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
      <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-[#dce8ff]/24 blur-3xl" />
      <div className="absolute -top-8 left-2 h-24 w-24 rounded-full bg-[#8dc4d6]/12 blur-3xl" />

      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-700 sm:text-xs sm:tracking-[0.2em]">
              Extrato do acumulado
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.35rem]">
              Movimentações
            </h2>
            <p className="mt-1 text-[13px] leading-4 text-slate-600 sm:text-sm">
              Parcelas que entram no saldo de resgate de 5 anos.
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-[0_10px_20px_rgba(148,163,184,0.10)] sm:text-[11px] ${
              hasInstallments
                ? "border border-emerald-100/80 bg-emerald-50/90 text-emerald-800"
                : "border border-white/80 bg-white/[0.78] text-slate-600"
            }`}
          >
            {hasInstallments
              ? `${accumulatedInstallments.length} registro${accumulatedInstallments.length > 1 ? "s" : ""}`
              : "Aguardando"}
          </span>
        </div>

        <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {!hasInstallments ? (
            <div className="rounded-[1rem] border border-dashed border-slate-300/90 bg-white/[0.62] px-4 py-6 text-[13px] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:rounded-[1.1rem] sm:px-5 sm:py-7 sm:text-sm">
              <p className="font-semibold text-slate-700">
                Nenhuma parcela acumulada ainda.
              </p>
              <p className="mt-2 leading-5 text-slate-500">
                Assim que o primeiro valor acumulado for registrado, ele aparecerá aqui e começará a compor o resgate futuro.
              </p>
            </div>
          ) : null}

          {accumulatedInstallments.map((installment) => (
            <div
              key={installment.id}
              className="flex flex-col gap-3 rounded-[1rem] border border-white/78 bg-white/[0.84] px-3 py-3 shadow-[0_14px_28px_rgba(148,163,184,0.14)] transition duration-300 hover:border-emerald-100 hover:bg-white hover:shadow-[0_18px_38px_rgba(148,163,184,0.18)] sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.1rem]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <InstallmentIcon />

                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-4 text-slate-900 sm:text-sm">
                    Parcela acumulada
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-slate-500 sm:text-sm">
                    {formatDateBR(installment.addedAt)}
                  </p>
                </div>
              </div>

              <p className="shrink-0 text-left text-base font-semibold tracking-tight text-emerald-700 sm:text-right sm:text-lg">
                {formatCurrencyBRL(installment.accumulatedAmount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
