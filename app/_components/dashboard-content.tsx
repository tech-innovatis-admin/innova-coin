"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  getUserDashboardData,
  mockHeads,
  mockUser,
  type MockUser,
} from "@/lib/mock-data";
import AppHeader from "./app-header";
import CountdownCard from "./countdown-card";
import StatementCard from "./statement-card";
import { formatCurrencyBRL } from "@/lib/formatters";

const PIG_SEGMENT_COUNT = 20;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFilledPigSegments(availableAt: string) {
  const releaseDate = new Date(availableAt);
  const cycleStart = new Date(releaseDate);
  cycleStart.setFullYear(cycleStart.getFullYear() - 5);

  const totalDuration = releaseDate.getTime() - cycleStart.getTime();
  const elapsedDuration = Date.now() - cycleStart.getTime();
  const progress = totalDuration <= 0 ? 1 : clamp(elapsedDuration / totalDuration, 0, 1);

  return Math.floor(progress * PIG_SEGMENT_COUNT);
}

function SavingsPig({ availableAt }: { availableAt: string }) {
  const targetFilledSegments = getFilledPigSegments(availableAt);
  const [animatedSegments, setAnimatedSegments] = useState(0);
  const radius = 145;
  const circumference = 2 * Math.PI * radius;
  const progress = animatedSegments / PIG_SEGMENT_COUNT;
  const progressOffset = circumference * (1 - progress);

  useEffect(() => {
    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    setAnimatedSegments(0);

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
      <div className="relative flex h-[320px] w-[420px] -translate-y-5 items-center justify-center">
        <svg
          viewBox="0 0 360 360"
          className="absolute h-[320px] w-[320px]"
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

        <div className="relative h-[196px] w-[196px] translate-x-[4px] translate-y-[2px]">
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

export default function DashboardContent() {
  const [user] = useState<MockUser>(() => getUserDashboardData(mockUser, mockHeads));

  return (
    <>
      <AppHeader profileMode="user" userName={user.name} userPhoto={user.photoUrl} />
      <main className="mt-17 flex flex-1 overflow-hidden px-6 pt-3 pb-4">
        <section className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-slate-50 px-8 py-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-700">
                Dashboard do Head
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Olá, {user.name}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Este painel mostra quanto você tem a receber e quando esse valor
                ficará disponível para resgate.
              </p>
            </div>

            <div className="flex justify-end lg:min-w-[300px]">
              <div className="relative rounded-[1.75rem] border border-white/60 bg-white/70 px-6 py-5 text-right shadow-[0_14px_30px_rgba(148,163,184,0.16)] backdrop-blur-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Saldo atual
                </span>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {formatCurrencyBRL(user.pendingBalance)}
                </p>
                <div className="absolute -top-3 right-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-[0_10px_22px_rgba(16,185,129,0.12)]">
                  + {formatCurrencyBRL(user.lastInstallment ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px_340px] xl:items-stretch">
            <SavingsPig availableAt={user.availableAt} />
            <CountdownCard availableAt={user.availableAt} status={user.status} />
            <StatementCard installments={user.installments} />
          </div>
        </section>
      </main>
    </>
  );
}
