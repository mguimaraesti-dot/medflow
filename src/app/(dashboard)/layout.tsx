import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
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

  return (
    <div className="bg-background flex min-h-screen">
      <AppSidebar userName={user.name} roleName={user.roleName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileSidebarTrigger userName={user.name} roleName={user.roleName} />
        <main className="flex-1 space-y-6 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
