import DashboardContent from "../_components/dashboard-content";
import { mapInstallments, getInstallmentsByUserId } from "@/lib/installments";
import { getDashboardUserById } from "@/lib/heads";
import { requireHeadUser } from "@/lib/auth";

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
    throw new Error("User not found in database.");
  }

  return <DashboardContent initialUser={dashboardUser} />;
}
