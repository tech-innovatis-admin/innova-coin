"use client";

import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";
import type { InstallmentEntry } from "@/lib/mock-data";

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
  const sortedInstallments = [...installments].sort(
    (firstInstallment, secondInstallment) =>
      new Date(secondInstallment.addedAt).getTime() -
      new Date(firstInstallment.addedAt).getTime(),
  );

  return (
    <article className="relative min-h-0 overflow-hidden rounded-[2rem] border border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(202,215,238,0.42))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.16),0_16px_36px_rgba(43,58,92,0.12)] ring-1 ring-white/30 backdrop-blur-md xl:h-[calc(100%-36px)] xl:self-start">
      <div className="absolute inset-x-8 top-0 h-px bg-white/92" />
      <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
      <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-[#dce8ff]/24 blur-3xl" />
      <div className="absolute -top-8 left-2 h-24 w-24 rounded-full bg-[#8dc4d6]/12 blur-3xl" />

      <div className="relative flex h-full min-h-0 flex-col">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
          Extrato
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
          Parcelas
        </h2>
        <p className="mt-1 text-sm leading-4 text-slate-600">
          Valores e datas das entradas.
        </p>

        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {sortedInstallments.map((installment) => (
            <div
              key={installment.id}
              className="flex items-center justify-between gap-2 rounded-[1.1rem] border border-white/70 bg-white/70 px-2.5 py-2 shadow-[0_10px_24px_rgba(148,163,184,0.12)]"
            >
              <div className="flex items-center gap-3">
                <InstallmentIcon />

                <div>
                <p className="text-sm font-semibold leading-4 text-slate-900">
                  Parcela adicionada
                </p>
                <p className="mt-1 text-sm leading-4 text-slate-500">
                  {formatDateBR(installment.addedAt)}
                </p>
                </div>
              </div>

              <p className="text-lg font-semibold tracking-tight text-emerald-700">
                {formatCurrencyBRL(installment.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
