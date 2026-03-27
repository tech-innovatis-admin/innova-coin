"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { formatCurrencyBRL } from "@/lib/formatters";
import { type DashboardUser } from "@/lib/heads";
import CountdownCard from "./countdown-card";
import StatementCard from "./statement-card";

const PIG_SEGMENT_COUNT = 20;

function SavingsPig({ targetFilledSegments }: { targetFilledSegments: number }) {
  const [animatedSegments, setAnimatedSegments] = useState(0);
  const radius = 145;
  const circumference = 2 * Math.PI * radius;
  const progress = animatedSegments / PIG_SEGMENT_COUNT;
  const progressOffset = circumference * (1 - progress);

  useEffect(() => {
    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const animate = (nextSegment: number) => {
      timeoutId = setTimeout(() => {
        frameId = window.requestAnimationFrame(() => {
          setAnimatedSegments(nextSegment);

          if (nextSegment < targetFilledSegments) {
            animate(nextSegment + 1);
          }
        });
      }, 80);
    };

    if (targetFilledSegments > 0) {
      animate(1);
    }

    return () => {
      window.cancelAnimationFrame(frameId);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [targetFilledSegments]);

  return (
    <div className="flex justify-center">
      <div className="relative flex h-[220px] w-[280px] items-center justify-center sm:h-[280px] sm:w-[360px] sm:-translate-y-2 xl:h-[320px] xl:w-[420px] xl:-translate-y-5">
        <svg
          viewBox="0 0 360 360"
          className="absolute h-[220px] w-[220px] sm:h-[280px] sm:w-[280px] xl:h-[320px] xl:w-[320px]"
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
  heading = `Ola, ${user.name}`,
  intro = "Este painel mostra quanto voce tem a receber e quando esse valor ficara disponivel para resgate.",
}: HeadDashboardPanelProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-3 sm:gap-4 sm:rounded-[2rem] sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-2">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-700 sm:text-sm sm:tracking-[0.25em]">
            Dashboard do Head
          </p>
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.4rem] lg:text-4xl">
            {heading}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            {intro}
          </p>
        </div>

        <div className="flex justify-end lg:min-w-[300px]">
          <div className="relative rounded-[1.4rem] border border-white/60 bg-white/70 px-4 py-4 text-right shadow-[0_14px_30px_rgba(148,163,184,0.16)] backdrop-blur-sm sm:rounded-[1.75rem] sm:px-6 sm:py-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">
              Saldo atual
            </span>
            <p className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {formatCurrencyBRL(user.pendingBalance)}
            </p>
            <div className="absolute -top-3 right-3 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-[0_10px_22px_rgba(16,185,129,0.12)] sm:right-4 sm:px-3 sm:py-2 sm:text-xs">
              + {formatCurrencyBRL(user.lastInstallment ?? 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_280px_340px] xl:items-start">
        <SavingsPig
          key={`${user.availableAt}-${user.filledPigSegments}`}
          targetFilledSegments={user.filledPigSegments}
        />
        <CountdownCard availableAt={user.availableAt} status={user.status} />
        <StatementCard installments={user.installments} />
      </div>
    </section>
  );
}
