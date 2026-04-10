"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import {
  getPasswordPolicyStatus,
  validatePasswordChangeFields,
} from "@/lib/passwordPolicy";

type FirstAccessPasswordFormProps = {
  userName: string;
};

type PasswordChangeResponse =
  | {
      success: true;
      message: string;
      redirectTo: string;
    }
  | {
      error: string;
    };

type PasswordFieldProps = {
  label: string;
  name: "currentPassword" | "newPassword" | "confirmPassword";
  placeholder: string;
  value: string;
  error?: string;
  showValue: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleVisibility: () => void;
};

function VisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a2 2 0 0 0 2.8 2.8" />
        <path d="M9.4 5.5A9.8 9.8 0 0 1 12 5c5 0 9 4 10 7-0.4 1.3-1.3 2.8-2.6 4.1" />
        <path d="M6.6 6.7C4.5 8 3.3 9.8 2 12c1 3 5 7 10 7 1.7 0 3.2-.4 4.5-1" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  value,
  error,
  showValue,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <div className="relative">
        <input
          type={showValue ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-2xl border bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-400 sm:py-3.5 ${
            error
              ? "border-rose-400/40 focus:border-rose-300/60"
              : "border-white/10 focus:border-cyan-300/50"
          }`}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/8 hover:text-white"
          aria-label={showValue ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={showValue}
        >
          <VisibilityIcon visible={showValue} />
        </button>
      </div>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
    </label>
  );
}

export default function FirstAccessPasswordForm({
  userName,
}: FirstAccessPasswordFormProps) {
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordStatus = getPasswordPolicyStatus(values.newPassword);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    const fieldName = name as keyof typeof values;

    setValues((current) => ({
      ...current,
      [fieldName]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [fieldName]: undefined,
    }));
    setError(null);
    setSuccess(null);
  }

  function handleToggleVisibility(fieldName: keyof typeof showPassword) {
    setShowPassword((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const validation = validatePasswordChangeFields(values);

    if (!validation.isValid) {
      setFieldErrors(validation.fieldErrors);
      setError(
        validation.fieldErrors.currentPassword ||
          validation.fieldErrors.newPassword ||
          validation.fieldErrors.confirmPassword ||
          "Revise os campos informados.",
      );
      return;
    }

    setPending(true);
    setFieldErrors({});
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = (await response.json()) as PasswordChangeResponse;

      if (!response.ok) {
        setError("error" in data ? data.error : "Nao foi possivel atualizar a senha.");
        return;
      }

      if (!("success" in data) || !data.redirectTo) {
        setError("Resposta de troca de senha invalida.");
        return;
      }

      setSuccess(data.message);
      window.setTimeout(() => {
        window.location.replace(data.redirectTo);
      }, 900);
    } catch {
      setError("Nao foi possivel conectar ao servidor.");
    } finally {
      setPending(false);
    }
  }

  const passwordRules = [
    {
      label: "Minimo de 8 caracteres",
      satisfied: passwordStatus.minLength,
    },
    {
      label: "1 letra maiuscula",
      satisfied: passwordStatus.uppercase,
    },
    {
      label: "1 letra minuscula",
      satisfied: passwordStatus.lowercase,
    },
    {
      label: "1 numero",
      satisfied: passwordStatus.number,
    },
    {
      label: "1 caractere especial",
      satisfied: passwordStatus.specialCharacter,
    },
  ];

  return (
    <section className="w-full rounded-[1.8rem] border border-white/10 bg-slate-950/55 px-5 py-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:px-8 sm:py-8">
      <div className="mb-5 space-y-2 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-200/80">
          Primeiro acesso
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Defina sua senha definitiva
        </h1>
        <p className="text-sm leading-6 text-slate-300">
          Ola, {userName}. Por seguranca, troque sua senha temporaria antes de
          acessar o restante da plataforma.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          label="Senha atual"
          name="currentPassword"
          placeholder="Digite sua senha temporaria"
          value={values.currentPassword}
          error={fieldErrors.currentPassword}
          showValue={showPassword.currentPassword}
          onChange={handleChange}
          onToggleVisibility={() => handleToggleVisibility("currentPassword")}
        />

        <PasswordField
          label="Nova senha"
          name="newPassword"
          placeholder="Crie uma senha forte"
          value={values.newPassword}
          error={fieldErrors.newPassword}
          showValue={showPassword.newPassword}
          onChange={handleChange}
          onToggleVisibility={() => handleToggleVisibility("newPassword")}
        />

        <PasswordField
          label="Confirmar nova senha"
          name="confirmPassword"
          placeholder="Repita a nova senha"
          value={values.confirmPassword}
          error={fieldErrors.confirmPassword}
          showValue={showPassword.confirmPassword}
          onChange={handleChange}
          onToggleVisibility={() => handleToggleVisibility("confirmPassword")}
        />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm font-medium text-white">Sua senha precisa ter:</p>
          <ul className="mt-3 space-y-2 text-sm">
            {passwordRules.map((rule) => (
              <li
                key={rule.label}
                className={`flex items-center gap-2 ${
                  rule.satisfied ? "text-emerald-200" : "text-slate-400"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    rule.satisfied ? "bg-emerald-300" : "bg-slate-500"
                  }`}
                  aria-hidden="true"
                />
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
        >
          {pending ? "Atualizando..." : "Concluir primeiro acesso"}
        </button>
      </form>
    </section>
  );
}
