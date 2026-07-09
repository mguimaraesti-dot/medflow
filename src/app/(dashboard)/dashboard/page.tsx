import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { DashboardScreen } from "@/features/dashboard/presentation/dashboard-screen";

export default async function DashboardPage() {
  const user = await getSessionUser();

  // Secretária (só Caixa Recepção) não tem DASHBOARD_READ — o login
  // redireciona todo mundo pra cá, então manda ela pro único módulo
  // que ela de fato acessa em vez de deixá-la numa tela vazia/negada.
  if (user && !user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/cash-flow");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardScreen permissions={user?.permissions ?? []} />
    </div>
  );
}
