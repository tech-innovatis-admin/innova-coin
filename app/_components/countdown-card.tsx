import { formatDateTimeBR, getRemainingTime } from "@/lib/formatters";
import type { WithdrawStatus } from "@/lib/mock-data";

type CountdownCardProps = {
  availableAt: string;
  status: WithdrawStatus;
};

export default function CountdownCard({
  availableAt,
  status,
}: CountdownCardProps) {
  const ready = status === "released" || new Date(availableAt).getTime() <= Date.now();

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(202,215,238,0.42))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.16),0_16px_36px_rgba(43,58,92,0.12)] ring-1 ring-white/30 backdrop-blur-md xl:h-[calc(100%-36px)] xl:self-start">
      <div className="absolute inset-x-8 top-0 h-px bg-white/92" />
      <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
      <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-[#dce8ff]/24 blur-3xl" />
      <div className="absolute -top-8 left-2 h-24 w-24 rounded-full bg-[#8dc4d6]/12 blur-3xl" />

      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
            Prazo de resgate
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${
            ready
              ? "bg-emerald-300/30 text-emerald-800"
              : "bg-amber-300/30 text-amber-800"
          }`}
        >
          {ready ? "Resgate liberado" : "Pendente"}
        </span>
      </div>

      <p className="relative mt-2 text-sm leading-5 text-slate-600">
        Data prevista: {formatDateTimeBR(availableAt)}
      </p>
    </article>
  );
}
