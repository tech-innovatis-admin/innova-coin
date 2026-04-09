import type { DashboardUser } from "@/lib/heads";
import HeadDashboardPanel from "../dashboard/HeadDashboardPanel";

type AdminHeadViewProps = {
  user: DashboardUser;
};

export default function AdminHeadView({ user }: AdminHeadViewProps) {
  const roleLabel = user.userType === "head" ? "head" : "colaborador";

  return (
    <HeadDashboardPanel
      user={user}
      heading={user.name}
      intro={`Você está vendo a mesma jornada patrimonial do ${roleLabel}, em modo de visualização.`}
    />
  );
}
