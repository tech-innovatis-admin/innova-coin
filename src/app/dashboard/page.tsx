import { DashboardContent } from "@/components";
import { mapInstallments, getInstallmentsByUserId } from "@/lib/installments";
import { getDashboardUserById } from "@/lib/heads";
import { requireHeadUser } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/platform-access";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Painel do HEAD",
  description: "",
};

export default async function DashboardPage() {
  const sessionUser = await requireHeadUser();
  const rows = await getInstallmentsByUserId(sessionUser.id);
  const installments = mapInstallments(rows);
  const dashboardUser = await getDashboardUserById(sessionUser.id, installments);

  if (!dashboardUser) {
    redirect(LOGIN_PATH);
  }

  return <DashboardContent initialUser={dashboardUser} />;
}
