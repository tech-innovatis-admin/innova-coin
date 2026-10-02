import { authErrorActions, authErrorMessage } from "@/lib/auth/authErrorCopy";
import { hubHomeUrl } from "@/lib/auth/hubHome";

export const dynamic = "force-dynamic";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const message = authErrorMessage(params.code);
  const [retry, backToHub] = authErrorActions(hubHomeUrl());

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#121826] px-4 py-10">
      <div className="w-full max-w-sm rounded-[1.7rem] border border-white/10 bg-slate-950/55 px-5 py-8 text-center shadow-2xl shadow-cyan-950/20 backdrop-blur sm:rounded-[2rem] sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Não foi possível entrar
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={retry.href}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            {retry.label}
          </a>
          <a
            href={backToHub.href}
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {backToHub.label}
          </a>
        </div>
      </div>
    </main>
  );
}
