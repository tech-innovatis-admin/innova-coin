import { DashboardContent } from "@/components";
import { mapInstallments, getInstallmentsByUserId } from "@/lib/installments";
import { getDashboardUserById } from "@/lib/heads";
import { requireAuthenticatedUser } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/platformAccess";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Painel da Plataforma",
  description: "",
};

export default async function DashboardPage() {
  const sessionUser = await requireAuthenticatedUser();
  const rows = await getInstallmentsByUserId(sessionUser.id);
  const installments = mapInstallments(rows);
  const dashboardUser = await getDashboardUserById(sessionUser.id, installments);

  if (!dashboardUser) {
    redirect(LOGIN_PATH);
  }

  return <DashboardContent initialUser={dashboardUser} />;
}
