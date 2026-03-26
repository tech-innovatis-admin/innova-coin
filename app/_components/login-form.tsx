import Image from "next/image";
import Link from "next/link";

export default function LoginForm() {
  return (
    <section className="w-full max-w-xs rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-2 flex flex-col items-center space-y-1 text-center">
        <Image
          src="/logo_innovatis_oficial.svg"
          alt="Logo"
          width={64}
          height={64}
        />
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Bem vindo
        </h1>
        <p className="text-sm leading-6 text-slate-300">
          Acesso para Usuários e Administradores
        </p>
      </div>

      <form className="space-y-1">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Usuário</span>
          <input
            type="text"
            placeholder="Digite seu usuário"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Senha</span>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50"
          />
        </label>

        <div className="grid gap-3 pt-4">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Entrar como usuário
          </Link>

          <Link
            href="/admin"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Entrar como admin
          </Link>
        </div>
      </form>
    </section>
  );
}
