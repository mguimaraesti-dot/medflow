import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { getRoleLabel } from "@/core/permissions/roles-permissions";
import {
  AppSidebar,
  MobileSidebarTrigger,
} from "@/shared/components/app-sidebar";

/**
 * Sidebar fixa (lg+) + Sheet (mobile) — substitui a topbar horizontal
 * da Sprint 1 agora que a navegação cresceu (Design Pass). Confirma
 * sessão (o middleware já protege a rota, isso é defesa em profundidade).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Usuário criado (convite de Admin/Gerente ou primeiro login via
  // Google) mas ainda sem perfil atribuído — não vê nenhuma tela do
  // dashboard até alguém liberar o acesso pela Gestão de Acessos.
  if (user.status === "PENDING") {
    redirect("/pending-approval");
  }

  const roleLabel = user.roleName ? getRoleLabel(user.roleName) : "—";

  return (
    <div className="bg-background flex min-h-screen">
      <AppSidebar
        userName={user.name}
        roleName={roleLabel}
        permissions={user.permissions}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileSidebarTrigger
          userName={user.name}
          roleName={roleLabel}
          permissions={user.permissions}
        />
        <main className="flex-1 space-y-6 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
