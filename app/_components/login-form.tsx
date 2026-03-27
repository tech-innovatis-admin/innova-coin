"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { loginAction, type LoginActionState } from "@/app/login/actions";

const initialState: LoginActionState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="w-full max-w-sm rounded-[1.7rem] border border-white/10 bg-slate-950/55 px-5 py-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:rounded-[2rem] sm:px-8 sm:py-9">
      <div className="mb-4 flex flex-col items-center space-y-2 text-center">
        <Image
          src="/logo_innovatis_oficial.svg"
          alt="Logo"
          width={60}
          height={60}
          className="sm:h-[72px] sm:w-[72px]"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Bem-vindo
        </h1>
      </div>

      <form action={formAction} className="space-y-3.5 sm:space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">
            Usuario ou e-mail
          </span>
          <input
            type="text"
            name="identifier"
            placeholder="Digite seu usuario ou e-mail"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 sm:py-3.5"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Senha</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="*************"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 sm:py-3.5"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/8 hover:text-white"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
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
              ) : (
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
              )}
            </button>
          </div>
        </label>

        {state?.error ? (
          <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </section>
  );
}
