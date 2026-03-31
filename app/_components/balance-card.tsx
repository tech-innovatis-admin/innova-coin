import { formatCurrencyBRL } from "@/lib/formatters";

type BalanceCardProps = {
  value: number;
};

export default function BalanceCard({ value }: BalanceCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(202,215,238,0.42))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.16),0_16px_36px_rgba(43,58,92,0.12)] ring-1 ring-white/30 backdrop-blur-md">
      <div className="absolute inset-x-8 top-0 h-px bg-white/92" />
      <div className="absolute left-5 top-5 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
      <div className="absolute -right-10 -top-8 h-32 w-32 rounded-full bg-[#dce8ff]/28 blur-3xl" />
      <div className="absolute -bottom-10 left-6 h-28 w-28 rounded-full bg-[#8ab2a9]/12 blur-3xl" />

      <div className="relative">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
          Saldo pendente
        </p>
        <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {formatCurrencyBRL(value)}
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
          Valor disponível para resgate assim que o prazo for
          atingido.
        </p>
      </div>
    </article>
  );
}
