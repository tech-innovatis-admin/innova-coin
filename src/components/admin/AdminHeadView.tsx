import type { DashboardUser } from "@/lib/heads";
import HeadDashboardPanel from "../dashboard/HeadDashboardPanel";

type AdminHeadViewProps = {
  user: DashboardUser;
};

function getAdminIntro(user: DashboardUser) {
  if (user.userType === "head") {
    return "Voce esta vendo a mesma jornada patrimonial do head, em modo de visualizacao.";
  }

  return "Voce esta vendo o ciclo anual de bonus do colaborador, com resgate previsto para 31/12/2026.";
}

export default function AdminHeadView({ user }: AdminHeadViewProps) {
  return (
    <HeadDashboardPanel
      user={user}
      heading={user.name}
      intro={getAdminIntro(user)}
    />
  );
}
