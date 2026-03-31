"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { formatCurrencyBRL } from "@/lib/formatters";
import { type DashboardUser } from "@/lib/heads";
import CajuStatementCard from "./caju-statement-card";
import StatementCard from "./statement-card";

const PIG_SEGMENT_COUNT = 20;

function SavingsPig({
  targetFilledSegments,
  hasInstallments,
}: {
  targetFilledSegments: number;
  hasInstallments: boolean;
}) {
  const [animatedSegments, setAnimatedSegments] = useState(0);
  const radius = 145;
  const circumference = 2 * Math.PI * radius;
  const safeTargetFilledSegments = Math.min(
    Math.max(targetFilledSegments, 0),
    PIG_SEGMENT_COUNT,
  );
  const cycleProgressPercent = Math.round(
    (safeTargetFilledSegments / PIG_SEGMENT_COUNT) * 100,
  );
  const progress = animatedSegments / PIG_SEGMENT_COUNT;
  const progressOffset = circumference * (1 - progress);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAnimatedSegments((currentSegments) => {
        if (currentSegments === safeTargetFilledSegments) {
          window.clearInterval(intervalId);
          return currentSegments;
        }

        return currentSegments < safeTargetFilledSegments
          ? currentSegments + 1
          : currentSegments - 1;
      });
    }, 80);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [safeTargetFilledSegments]);

  return (
    <div className="flex w-full justify-center">
      <div className="group relative flex h-full w-full flex-col items-center rounded-[2rem] border border-white/72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(239,246,255,0.90)_48%,rgba(219,234,254,0.78)_100%)] px-5 py-5 shadow-[0_26px_68px_rgba(15,23,42,0.14)] ring-1 ring-cyan-100/80 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_34px_84px_rgba(15,23,42,0.18)] sm:min-h-[390px] sm:px-6 sm:py-6 xl:min-h-[420px] xl:py-7">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),transparent_60%)]" />
        <div className="relative rounded-full border border-cyan-200/70 bg-white/84 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800 shadow-[0_12px_24px_rgba(14,116,144,0.08)] backdrop-blur-sm sm:text-[11px]">
          Jornada de 5 anos
        </div>
        <div className="relative flex min-h-[230px] w-full flex-1 items-center justify-center py-3 sm:min-h-[250px] sm:py-4 xl:min-h-[300px]">
          <svg
            viewBox="0 0 360 360"
            className="absolute h-[220px] w-[220px] drop-shadow-[0_18px_35px_rgba(15,23,42,0.08)] sm:h-[280px] sm:w-[280px] xl:h-[320px] xl:w-[320px]"
            aria-hidden="true"
          >
            <circle
              cx="180"
              cy="180"
              r={radius}
              fill="none"
              stroke="#bfdbfe"
              strokeWidth="15"
            />
            <circle
              cx="180"
              cy="180"
              r={radius}
              fill="none"
              stroke="#22c55e"
              strokeWidth="15"
              strokeLinecap="butt"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              transform="rotate(-90 180 180)"
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_62%)] opacity-80 blur-2xl transition duration-300 group-hover:opacity-100" />
          <div className="relative h-[136px] w-[136px] translate-x-[3px] translate-y-[1px] sm:h-[170px] sm:w-[170px] xl:h-[196px] xl:w-[196px] xl:translate-x-[4px] xl:translate-y-[2px]">
            <Image
              src="/porkazul.png?v=2"
              alt="Porquinho"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </div>
        <div className="relative mt-auto w-full rounded-[1.15rem] border border-white/75 bg-white/[0.8] px-4 py-4 shadow-[0_16px_30px_rgba(148,163,184,0.16)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 text-[11px] font-medium text-slate-500 sm:text-xs">
            <span className="max-w-[220px] leading-4">
              {hasInstallments
                ? "Crescimento patrimonial em acumulação"
                : "Aguardando o primeiro aporte do ciclo"}
            </span>
            <span className="shrink-0 font-semibold text-slate-700">
              {hasInstallments ? `${cycleProgressPercent}% concluído` : "0%"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type HeadDashboardPanelProps = {
  user: DashboardUser;
  heading?: string;
  intro?: string;
};

export default function HeadDashboardPanel({
  user,
  heading = `Olá, ${user.name}`,
  intro = "Acompanhe a evolução do seu bônus ao longo do ciclo de 5 anos e veja quando o saldo estará pronto para resgate.",
}: HeadDashboardPanelProps) {
  const hasInstallments = user.installments.some(
    (installment) => installment.accumulatedAmount > 0,
  );
  const cycleProgressPercent = Math.round(
    (Math.min(Math.max(user.filledPigSegments, 0), PIG_SEGMENT_COUNT) /
      PIG_SEGMENT_COUNT) *
      100,
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.96),rgba(241,245,249,0.88))] px-5 py-5 shadow-[0_20px_48px_rgba(148,163,184,0.12)] ring-1 ring-white/70 transition duration-300 hover:shadow-[0_24px_64px_rgba(148,163,184,0.16)] sm:rounded-[2.15rem] sm:px-8 sm:py-7 lg:flex lg:items-start lg:justify-between lg:gap-8 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_34%)]" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-700 sm:text-sm sm:tracking-[0.25em]">
            Veja seu saldo no Innova Coin
          </p>
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.4rem] lg:text-4xl">
            {heading}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            {intro}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-full border border-white/80 bg-white/[0.82] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-[0_10px_22px_rgba(148,163,184,0.10)]">
              Horizonte de 5 anos
            </span>
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50/[0.90] px-3 py-1 text-[11px] font-semibold text-emerald-800 shadow-[0_10px_22px_rgba(16,185,129,0.10)]">
              {hasInstallments
                ? `${cycleProgressPercent}% do ciclo concluído`
                : "O ciclo começa com o primeiro aporte"}
            </span>
          </div>
        </div>

        <div className="mt-5 flex w-full justify-end lg:mt-0 lg:w-auto lg:max-w-[400px] lg:flex-none">
          <div className="relative w-full rounded-[1.55rem] border border-white/75 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(240,249,255,0.90)_54%,rgba(224,242,254,0.82)_100%)] px-6 py-6 shadow-[0_26px_70px_rgba(15,23,42,0.12)] ring-1 ring-white/85 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_82px_rgba(15,23,42,0.16)] sm:rounded-[1.9rem] sm:px-7 sm:py-7 lg:min-w-[360px]">
            <div className="pointer-events-none absolute inset-0 rounded-[1.9rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.90),transparent_58%)]" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">
                Saldo acumulado
              </span>
              {hasInstallments ? (
                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/[0.95] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800 shadow-[0_16px_34px_rgba(16,185,129,0.14)] sm:text-[11px]">
                  <span className="block text-[9px] font-semibold tracking-[0.16em] text-emerald-700/80 sm:text-[10px]">
                    Último aporte
                  </span>
                  <span className="mt-1 block text-sm tracking-normal text-emerald-900 sm:text-base">
                    + {formatCurrencyBRL(user.lastInstallment ?? 0)}
                  </span>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/90 bg-slate-100/[0.96] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-[0_16px_34px_rgba(148,163,184,0.12)] sm:text-[11px]">
                  <span className="block text-[9px] tracking-[0.16em] text-slate-500 sm:text-[10px]">
                    Status do ciclo
                  </span>
                  <span className="mt-1 block text-sm tracking-normal text-slate-800 sm:text-base">
                    Não iniciado
                  </span>
                </div>
              )}
            </div>
            <p className="relative mt-4 text-[2.35rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[3.15rem]">
              {formatCurrencyBRL(user.pendingBalance)}
            </p>
            <p className="relative mt-2 max-w-[26rem] text-sm font-medium leading-6 text-slate-600">
              {hasInstallments
                ? "Capital em acumulação de longo prazo"
                : "Pronto para iniciar a jornada de acumulação"}
            </p>
            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#22c55e_32%,#38bdf8_100%)] transition-[width] duration-500"
                style={{ width: `${hasInstallments ? cycleProgressPercent : 0}%` }}
              />
            </div>
            <div className="relative mt-2 flex items-center justify-between gap-4 text-[11px] font-medium text-slate-500 sm:text-xs">
              <span className="max-w-[240px] leading-4">
                {hasInstallments
                  ? "Maturação do saldo em andamento"
                  : "Aguardando o primeiro aporte administrativo"}
              </span>
              <span className="font-semibold text-slate-700">
                {hasInstallments ? `${cycleProgressPercent}%` : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(380px,1.05fr)_minmax(420px,1.18fr)] xl:items-stretch">
        <SavingsPig
          targetFilledSegments={user.filledPigSegments}
          hasInstallments={hasInstallments}
        />
        <StatementCard installments={user.installments} />
      </div>

      <CajuStatementCard
        installments={user.installments}
        cajuBalance={user.cajuBalance}
      />
    </section>
  );
}
