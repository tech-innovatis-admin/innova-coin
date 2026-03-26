"use client";

import { ChangeEvent, useId, useState } from "react";

import {
  formatCurrencyBRL,
  getRemainingTime,
} from "@/lib/formatters";
import type {
  HeadAccount,
  InstallmentEntry,
  WithdrawStatus,
} from "@/lib/mock-data";
import UserAvatar from "./user-avatar";

type AdminFormProps = {
  heads: HeadAccount[];
};

type DraftHead = {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  pendingBalance: number;
  installments: InstallmentEntry[];
  newInstallment: string;
  availableAt: string;
  status: WithdrawStatus;
};

type ModalMode = "create" | "edit";

function toInputDate(value: string) {
  return value.slice(0, 16);
}

function getDefaultAvailableAt() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 5);
  return toInputDate(date.toISOString());
}

export default function AdminForm({ heads }: AdminFormProps) {
  const photoInputId = useId();
  const [items, setItems] = useState<HeadAccount[]>(heads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [draft, setDraft] = useState<DraftHead | null>(null);

  const selectedHead = items.find((head) => head.id === selectedId) ?? null;

  function openEditModal(head: HeadAccount) {
    setModalMode("edit");
    setSelectedId(head.id);
    setDraft({
      ...head,
      newInstallment: "",
      availableAt: toInputDate(head.availableAt),
    });
  }

  function openCreateModal() {
    const nextNumber = items.length + 1;

    setModalMode("create");
    setSelectedId(null);
    setDraft({
      id: `head_${String(nextNumber).padStart(3, "0")}`,
      userId: `usr_${String(nextNumber).padStart(3, "0")}`,
      name: "",
      email: "",
      photoUrl: null,
      pendingBalance: 0,
      installments: [],
      newInstallment: "",
      availableAt: getDefaultAvailableAt(),
      status: "pending",
    });
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setDraft(null);
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
    if (!draft || !modalMode) return;

    if (modalMode === "create") {
      setItems((current) => [draft, ...current]);
    }

    if (modalMode === "edit") {
      setItems((current) =>
        current.map((head) =>
          head.id === draft.id
            ? {
                ...head,
                ...draft,
                pendingBalance:
                  head.pendingBalance + Number(draft.newInstallment || 0),
              }
            : head,
        ),
      );
    }

    closeModal();
  }

  return (
    <>
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            Gerencie os heads cadastrados e ajuste saldo ou prazo.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-[#00C48B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07b694]"
        >
          Adicionar head
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((head) => {
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

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={head.name}
                    photoUrl={head.photoUrl}
                    size="md"
                    className="border-cyan-400/40 text-cyan-700"
                  />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{head.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{head.email}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
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

              <button
                type="button"
                onClick={() => openEditModal(head)}
                className="relative mt-5 w-full rounded-2xl border border-[#08c9a5]/30 bg-[#08c9a5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#07b694]"
              >
                Editar head
              </button>
            </article>
          );
        })}
      </section>

      {draft && modalMode ? (
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
                  {modalMode === "create" ? "Novo head" : "Editar head"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {modalMode === "create"
                    ? "Cadastrar novo head"
                    : selectedHead?.name}
                </h2>
                {modalMode === "edit" && selectedHead ? (
                  <p className="mt-2 text-sm text-cyan-100/80">
                    Saldo atual: {formatCurrencyBRL(selectedHead.pendingBalance)}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="mb-2 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={draft.name || "Novo head"}
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
                      <br></br>
                      <label
                        htmlFor={photoInputId}
                        className="mt-2 inline-flex cursor-pointer rounded-full bg-[#08c9a5] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#07b694]"
                      >
                        Selecionar foto
                      </label>
                      <p className="mt-2 text-sm text-slate-300">
                        {draft.photoUrl
                          ? " "
                          : "Nenhuma imagem selecionada"}
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
                  {modalMode === "create" ? "Saldo inicial" : "Adicionar nova parcela"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={
                    modalMode === "edit" ? "Digite o valor da parcela" : undefined
                  }
                  value={
                    modalMode === "create" ? draft.pendingBalance : draft.newInstallment
                  }
                  onChange={(event) =>
                    updateDraft(
                      modalMode === "create" ? "pendingBalance" : "newInstallment",
                      modalMode === "create"
                        ? Number(event.target.value)
                        : event.target.value,
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Data de liberacao
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
                    updateDraft("status", event.target.value as WithdrawStatus)
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

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveHead}
                className="rounded-full bg-[#08c9a5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#07b694]"
              >
                {modalMode === "create" ? "Cadastrar head" : "Salvar alteracoes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
