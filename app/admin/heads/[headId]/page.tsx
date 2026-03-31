import AppHeader from "../../../_components/app-header";
import AdminHeadView from "../../../_components/admin-head-view";
import { requireAdminUser } from "@/lib/auth";
import { getDashboardUserById } from "@/lib/heads";
import { getInstallmentsByUserId, mapInstallments } from "@/lib/installments";
import { notFound } from "next/navigation";

type AdminHeadPageProps = {
  params: Promise<{
    headId: string;
  }>;
};

export const metadata = {
  title: "Visualização do HEAD",
  description: "",
};

export default async function AdminHeadPage({ params }: AdminHeadPageProps) {
  const sessionUser = await requireAdminUser();
  const { headId } = await params;
  const rows = await getInstallmentsByUserId(headId);
  const installments = mapInstallments(rows);
  const headUser = await getDashboardUserById(headId, installments);

  if (!headUser) {
    notFound();
  }

  return (
    <>
      <AppHeader
        profileMode="admin"
        userName={sessionUser.name || sessionUser.username || "Equipe Financeira"}
        userPhoto={sessionUser.photo}
        headerAction={{
          href: "/admin",
          label: "Voltar ao admin",
        }}
      />
      <main className="mt-17 flex flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.06),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_48%,#f1f5f9_100%)] px-6 pt-6 pb-6">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
          <AdminHeadView user={headUser} />
        </section>
      </main>
    </>
  );
}
