import {
  AppHeader,
  FirstAccessPasswordForm,
  ParticlesBackground,
} from "@/components";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getPostLoginPath, LOGIN_PATH } from "@/lib/platformAccess";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Primeiro acesso | Innova Coin",
  description: "",
};

export default async function FirstAccessPage() {
  const sessionUser = await requireAuthenticatedUser({
    allowMustChangePassword: true,
  });

  if (!sessionUser.mustChangePassword) {
    redirect(getPostLoginPath(sessionUser) ?? LOGIN_PATH);
  }

  const displayName =
    sessionUser.name?.trim() ||
    sessionUser.username?.trim() ||
    sessionUser.email?.trim() ||
    "Usuario";

  return (
    <>
      <AppHeader
        profileMode="user"
        userName={displayName}
        userPhoto={sessionUser.photo}
      />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-8 pt-24 sm:px-6 sm:pt-28">
        <div className="absolute inset-0 z-0 bg-[#121826]" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%)]" />
        <ParticlesBackground />

        <section className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6 text-white shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-8 lg:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-200/80">
              Acesso protegido
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Seu acesso fica liberado logo apos a troca de senha
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Enquanto a senha temporaria estiver ativa, o InnovaCoin bloqueia a
              navegacao para o restante do app. Assim que a nova senha for salva,
              sua sessao sera atualizada e voce segue para a area correta.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  1. Validacao
                </p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  Confirmamos sua senha atual antes de qualquer alteracao.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  2. Seguranca
                </p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  A nova senha precisa atender toda a politica minima.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  3. Liberacao
                </p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  Depois da troca, o bloqueio e removido da sua sessao.
                </p>
              </div>
            </div>
          </article>

          <FirstAccessPasswordForm userName={displayName} />
        </section>
      </main>
    </>
  );
}
