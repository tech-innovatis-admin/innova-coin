"use client";

import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";
import type { InstallmentEntry } from "@/lib/heads";

type CajuStatementCardProps = {
  installments: InstallmentEntry[];
  cajuBalance: number;
};

function buildBonusLabel(addedAt: string) {
  return `Bônus liberado em ${formatDateBR(addedAt)}`;
}

export default function CajuStatementCard({
  installments,
  cajuBalance,
}: CajuStatementCardProps) {
  const cajuInstallments = [...installments]
    .filter((installment) => installment.cajuAmount > 0)
    .sort(
      (firstInstallment, secondInstallment) =>
        new Date(secondInstallment.addedAt).getTime() -
        new Date(firstInstallment.addedAt).getTime(),
    );
  const hasInstallments = cajuInstallments.length > 0;

  return (
    <article className="relative overflow-hidden rounded-[1.8rem] border border-emerald-100/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(236,253,245,0.86))] p-5 shadow-[0_20px_46px_rgba(16,185,129,0.10)] ring-1 ring-white/70 backdrop-blur-md sm:p-6">
      <div className="absolute inset-x-8 top-0 h-px bg-white/92" />
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-200/24 blur-3xl" />
      <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-cyan-200/16 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-700 sm:text-xs sm:tracking-[0.2em]">
            Cartão Caju
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.65rem]">
            Você já ganhou {formatCurrencyBRL(cajuBalance)} para usar no Caju
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
            Esse valor é depositado pela empresa fora do ciclo de 5 anos. Aqui você acompanha
            quais bônus já foram liberados para uso no cartão.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
          Liberado para uso
        </span>
      </div>

      <div className="relative mt-5">
        {!hasInstallments ? (
          <div className="rounded-[1.3rem] border border-dashed border-slate-300/90 bg-white/75 px-5 py-6 text-sm leading-6 text-slate-500">
            Nenhum bônus do Caju foi registrado até o momento. Assim que a empresa liberar um
            novo valor, ele aparecerá aqui com a data do bônus.
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-white/80 bg-white/[0.86] p-4 shadow-[0_16px_34px_rgba(148,163,184,0.14)] sm:p-5">
            <div className="flex flex-col gap-3">
              {cajuInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className="flex flex-col gap-3 rounded-[1.1rem] border border-emerald-100/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,253,250,0.88))] px-4 py-4 shadow-[0_10px_24px_rgba(16,185,129,0.08)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {buildBonusLabel(installment.addedAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Valor liberado pela empresa para uso no cartão Caju.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="inline-flex rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                      Liberado
                    </span>
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-semibold text-emerald-700">
                        {formatCurrencyBRL(installment.cajuAmount)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDateBR(installment.addedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
