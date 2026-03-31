import { AdminForm, AppHeader } from "@/components";
import { getHeadSummaries } from "@/lib/heads";
import { requireAdminUser } from "@/lib/auth";

export const metadata = {
  title: "Painel Administrativo",
  description: "",
};

export default async function AdminPage() {
  const sessionUser = await requireAdminUser();
  const heads = await getHeadSummaries();

  return (
    <>
      <AppHeader
        profileMode="admin"
        userName={sessionUser.name || sessionUser.username || "Equipe Financeira"}
        userPhoto={sessionUser.photo}
      />
      <main className="flex flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.06),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_48%,#f1f5f9_100%)] px-6 pt-20 pb-8">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
              Heads e saldos pendentes
            </h1>
          </div>

          <AdminForm heads={heads} />
        </section>
      </main>
    </>
  );
}
