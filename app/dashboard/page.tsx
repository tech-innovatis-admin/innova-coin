import DashboardContent from "../_components/dashboard-content";
import { mapInstallments, getInstallmentsByUserId } from "@/lib/installments";
import { getUserDashboardData, mockHeads, mockUser } from "@/lib/mock-data";
import { requireAuthenticatedUser } from "@/lib/auth";

export const metadata = {
  title: "Painel do HEAD",
  description: "",
};

export default async function DashboardPage() {
  const sessionUser = await requireAuthenticatedUser();
  const baseUser = {
    ...getUserDashboardData(mockUser, mockHeads),
    id: sessionUser.id,
    name: sessionUser.name || sessionUser.username || mockUser.name,
    email: sessionUser.email || mockUser.email,
    role: "user" as const,
    photoUrl: sessionUser.photo,
  };

  try {
    const rows = await getInstallmentsByUserId(sessionUser.id);

    if (rows.length === 0) {
      return <DashboardContent initialUser={baseUser} />;
    }

    const installments = mapInstallments(rows);
    const pendingBalance = installments.reduce(
      (total, installment) => total + installment.amount,
      0,
    );
    const lastInstallment = installments[0]?.amount ?? 0;

    return (
      <DashboardContent
        initialUser={{
          ...baseUser,
          installments,
          pendingBalance,
          lastInstallment,
        }}
      />
    );
  } catch (error) {
    console.error("Failed to load installments from PostgreSQL.", error);

    return <DashboardContent initialUser={baseUser} />;
  }
}
