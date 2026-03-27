"use client";

import Link from "next/link";
import { ChangeEvent, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveHeadAction } from "@/app/admin/actions";
import { formatCurrencyBRL, getRemainingTime } from "@/lib/formatters";
import type { HeadAccount } from "@/lib/heads";
import UserAvatar from "./user-avatar";

type AdminFormProps = {
  heads: HeadAccount[];
};

type DraftHead = {
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  newInstallment: string;
  availableAt: string;
  status: "pending" | "released";
};

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function AdminForm({ heads }: AdminFormProps) {
  const router = useRouter();
  const photoInputId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftHead | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedHead = heads.find((head) => head.id === selectedId) ?? null;

  function openEditModal(head: HeadAccount) {
    setSelectedId(head.id);
    setFeedback(null);
    setDraft({
      userId: head.userId,
      name: head.name,
      email: head.email === "-" ? "" : head.email,
      photoUrl: head.photoUrl,
      newInstallment: "",
      availableAt: toDateTimeLocalValue(head.availableAt),
      status: head.status,
    });
  }

  function closeModal() {
    if (isPending) {
      return;
    }

    setSelectedId(null);
    setDraft(null);
    setFeedback(null);
  }

  function updateDraft<K extends keyof DraftHead>(field: K, value: DraftHead[K]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateDraft(
        "photoUrl",
        typeof reader.result === "string" ? reader.result : null,
      );
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function saveHead() {
    if (!draft) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", draft.userId);
      formData.set("name", draft.name);
      formData.set("email", draft.email);
      formData.set("photoUrl", draft.photoUrl ?? "");
      formData.set("newInstallment", draft.newInstallment);
      formData.set("availableAt", draft.availableAt);
      formData.set("status", draft.status);

      const result = await saveHeadAction(undefined, formData);

      if (result?.error) {
        setFeedback(result.error);
        return;
      }

      setSelectedId(null);
      setDraft(null);
      setFeedback(null);
      router.refresh();
    });
  }

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            Heads carregados do banco. Edite perfil e registre novas parcelas reais.
          </p>
        </div>
      </section>

      {heads.length === 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Nenhum head encontrado
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Quando houver usuarios fora dos perfis admin e gestor, eles aparecerao aqui.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {heads.map((head) => {
            const ready = head.status === "released";

            return (
              <article
                key={head.id}
                className="relative overflow-hidden rounded-[1.75rem] border border-[#d7e6ff]/38 bg-[linear-gradient(145deg,rgba(244,248,255,0.72),rgba(202,215,238,0.42))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(130,151,189,0.16),0_16px_36px_rgba(43,58,92,0.12)] ring-1 ring-white/30 backdrop-blur-md"
              >
                <div className="absolute inset-x-5 top-0 h-px bg-white/92" />
                <div className="absolute left-4 top-4 h-10 w-10 rounded-full bg-white/28 blur-2xl" />
                <div className="absolute -right-10 -top-8 h-28 w-28 rounded-full bg-[#dce8ff]/28 blur-3xl" />
                <div className="absolute -bottom-12 left-2 h-28 w-28 rounded-full bg-[#6f87b7]/12 blur-3xl" />

                <div className="relative flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
                    <UserAvatar
                      name={head.name}
                      photoUrl={head.photoUrl}
                      size="md"
                      className="border-cyan-400/40 text-cyan-700"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {head.name}
                      </h2>
                      <p className="mt-1 truncate text-sm text-slate-500">{head.email}</p>
                    </div>
                  </div>

                  <span
                    className={`mr-1 shrink-0 self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      ready
                        ? "bg-emerald-300/30 text-emerald-800"
                        : "bg-amber-300/30 text-amber-800"
                    }`}
                  >
                    {ready ? "Liberado" : "Pendente"}
                  </span>
                </div>

                <div className="relative mt-5 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">
                      Valor
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">
                      {formatCurrencyBRL(head.pendingBalance)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">
                      Tempo restante
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {ready ? "Disponivel agora" : getRemainingTime(head.availableAt)}
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(head)}
                    className="flex-1 rounded-2xl border border-[#08c9a5]/30 bg-[#08c9a5] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#07b694]"
                  >
                    Editar head
                  </button>
                  <Link
                    href={`/admin/heads/${head.userId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Visualizar head
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {draft && selectedHead ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#111827] p-4 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/80">
                  Editar head
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {selectedHead.name}
                </h2>
                <p className="mt-2 text-sm text-cyan-100/80">
                  Saldo atual: {formatCurrencyBRL(selectedHead.pendingBalance)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="mb-2 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={draft.name || "Head"}
                    photoUrl={draft.photoUrl}
                    size="lg"
                  />

                  <div className="flex-1">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-200">
                        Foto do usuario
                      </span>
                      <input
                        id={photoInputId}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <br />
                      <label
                        htmlFor={photoInputId}
                        className="mt-2 inline-flex cursor-pointer rounded-full bg-[#08c9a5] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#07b694]"
                      >
                        Selecionar foto
                      </label>
                      <p className="mt-2 text-sm text-slate-300">
                        {draft.photoUrl ? "Foto pronta para salvar" : "Nenhuma imagem selecionada"}
                      </p>
                    </div>

                    {draft.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => updateDraft("photoUrl", null)}
                        className="mt-1 text-sm font-medium text-cyan-200 transition hover:text-white"
                      >
                        Remover foto
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Nome</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">E-mail</span>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => updateDraft("email", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Adicionar nova parcela
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Digite o valor da parcela"
                  value={draft.newInstallment}
                  onChange={(event) => updateDraft("newInstallment", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">
                    Liberacao estimada
                  </span>
                  <input
                    type="datetime-local"
                    value={draft.availableAt}
                    onChange={(event) => updateDraft("availableAt", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      updateDraft("status", event.target.value as "pending" | "released")
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                  >
                    <option value="pending" className="bg-slate-900">
                      Pendente
                    </option>
                    <option value="released" className="bg-slate-900">
                      Liberado
                    </option>
                  </select>
                </label>
              </div>

              {feedback ? (
                <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {feedback}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveHead}
                className="rounded-full bg-[#08c9a5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#07b694] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isPending}
              >
                {isPending ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
