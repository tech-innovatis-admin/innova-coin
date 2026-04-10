"use client";

import Link from "next/link";

import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";
import type { HeadAccount } from "@/lib/heads";
import UserAvatar from "../shared/UserAvatar";

type AdminFormProps = {
  heads: HeadAccount[];
};

function splitUserName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: name.trim(),
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function renderUserCard(user: HeadAccount) {
  const ready = user.status === "released";
  const isHead = user.userType === "head";
  const userTypeLabel = isHead ? "Head" : "Colaborador";
  const timingLabel = isHead ? "Tempo restante" : "Resgate do porquinho";
  const timingHint =
    !isHead && user.availableAt
      ? `Saque previsto em ${formatDateBR(user.availableAt)}`
      : null;
  const { firstName, lastName } = splitUserName(user.name);

  return (
    <article
      key={user.id}
      className="relative overflow-hidden rounded-[1.75rem] border border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(202,215,238,0.42))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.16),0_16px_36px_rgba(43,58,92,0.12)] ring-1 ring-white/30 backdrop-blur-md"
    >
      <div className="absolute inset-x-5 top-0 h-px bg-white/92" />
      <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
      <div className="absolute -right-10 -top-8 h-28 w-28 rounded-full bg-[#dce8ff]/28 blur-3xl" />
      <div className="absolute -bottom-12 left-2 h-28 w-28 rounded-full bg-[#6f87b7]/12 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
          <UserAvatar
            name={user.name}
            photoUrl={user.photoUrl}
            size="md"
            className="border-cyan-400/40 text-cyan-700"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-5 text-slate-950">
              <span className="block whitespace-nowrap">{firstName}</span>
              <span className="mt-0.5 block whitespace-nowrap">
                {lastName || "\u00A0"}
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-700">
              {userTypeLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start">
          <Link
            href={`/admin/heads/${user.userId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-700 transition hover:bg-cyan-500/20 hover:text-cyan-800"
            aria-label={`Visualizar painel de ${user.name}`}
          >
            <EyeIcon />
          </Link>
        </div>
      </div>

      <div className="relative mt-5 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Acumulado</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {formatCurrencyBRL(user.pendingBalance)}
          </p>
        </div>

        {isHead ? (
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">Caju liberado</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">
              {formatCurrencyBRL(user.cajuBalance)}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">{timingLabel}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {ready ? "Disponivel agora" : user.remainingTimeLabel}
          </p>
          {timingHint ? (
            <p className="mt-1 text-xs text-slate-500">{timingHint}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function renderSection({
  title,
  users,
}: {
  title: string;
  users: HeadAccount[];
}) {
  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white/80 p-3 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-4">
      <div className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-3 text-left">
        <span className="text-base font-semibold text-slate-950">{title}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {users.length}
        </span>
      </div>

      <div className="mt-1 border-t border-slate-200 px-1 pt-4">
        {users.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Nenhum colaborador encontrado.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => renderUserCard(user))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminForm({ heads }: AdminFormProps) {
  const headUsers = heads.filter((user) => user.userType === "head");
  const collaboratorUsers = heads.filter((user) => user.userType === "collaborator");

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            Os valores mostrados aqui sao somente leitura e vem da planilha integrada.
          </p>
        </div>
      </section>

      {heads.length === 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Nenhum usuario encontrado</h2>
          <p className="mt-2 text-sm text-slate-600">
            Quando houver usuarios na planilha, eles aparecerao aqui.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {renderSection({
            title: "Heads",
            users: headUsers,
          })}
          {renderSection({
            title: "Colaboradores",
            users: collaboratorUsers,
          })}
        </section>
      )}
    </>
  );
}
