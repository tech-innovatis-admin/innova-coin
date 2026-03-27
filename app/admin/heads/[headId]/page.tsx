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
  title: "Visualizacao do HEAD",
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
      <main className="mt-17 flex flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 pb-6">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
          <AdminHeadView headId={headId} user={headUser} />
        </section>
      </main>
    </>
  );
}
