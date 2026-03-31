import { formatDateBR, formatDateTimeBR } from "@/lib/formatters";
import type { WithdrawStatus } from "@/lib/heads";

type CountdownCardProps = {
  availableAt: string | null;
  remainingTimeLabel: string;
  status: WithdrawStatus;
};

export default function CountdownCard({
  availableAt,
  remainingTimeLabel,
  status,
}: CountdownCardProps) {
  const ready = status === "released";
  const waitingFirstDeposit = status === "awaiting_deposit";
  const badgeLabel = ready
    ? "Pronto para resgate"
    : waitingFirstDeposit
      ? "Ciclo não iniciado"
      : "Em acumulação";
  const badgeClassName = ready
    ? "bg-emerald-300/30 text-emerald-800"
    : waitingFirstDeposit
      ? "bg-slate-300/35 text-slate-700"
      : "bg-amber-300/30 text-amber-800";
  const primaryValue = ready
    ? "Disponível agora"
    : waitingFirstDeposit
      ? "A definir"
      : availableAt
        ? formatDateBR(availableAt)
        : "A definir";
  const primaryDescription = ready
    ? "Janela de saque aberta"
    : waitingFirstDeposit
      ? "A data será definida com o primeiro aporte"
      : `Tempo estimado: ${remainingTimeLabel}`;
  const secondaryDescription = waitingFirstDeposit
    ? "O prazo de resgate será projetado assim que o primeiro aporte trimestral for registrado."
    : availableAt
      ? `Referência completa: ${formatDateTimeBR(availableAt)}`
      : "O prazo de resgate será atualizado assim que houver um aporte válido.";

  return (
    <article className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[1.6rem] border border-[#d7e6ff]/34 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(216,229,248,0.40))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.14),0_16px_34px_rgba(43,58,92,0.08)] ring-1 ring-white/36 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(130,151,189,0.16),0_22px_48px_rgba(43,58,92,0.11)] sm:min-h-[390px] sm:rounded-[2rem] sm:p-5 xl:min-h-[420px] xl:p-6">
      <div className="absolute inset-x-8 top-0 h-px bg-white/92" />
      <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
      <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-[#dce8ff]/22 blur-3xl" />
      <div className="absolute -top-8 left-2 h-24 w-24 rounded-full bg-[#8dc4d6]/10 blur-3xl" />

      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-700 sm:text-xs sm:tracking-[0.2em]">
            Janela de resgate
          </p>
          <p className="mt-1 text-[13px] font-medium text-slate-500 sm:text-sm">
            Data estimada do ciclo atual
          </p>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:px-2.5 sm:text-xs sm:tracking-[0.15em] ${badgeClassName}`}
        >
          {badgeLabel}
        </span>
      </div>

      <p className="relative mt-8 text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.85rem]">
        {primaryValue}
      </p>
      <p className="relative mt-3 text-[13px] leading-6 text-slate-600 sm:text-sm">
        {primaryDescription}
      </p>
      <p className="relative mt-auto pt-6 text-[13px] leading-6 text-slate-500 sm:text-sm">
        {secondaryDescription}
      </p>
    </article>
  );
}
