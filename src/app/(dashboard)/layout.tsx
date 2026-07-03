import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { LogoutButton } from "@/features/auth/presentation/logout-button";

/**
 * Placeholder de layout — o Sidebar/Topbar de verdade entram quando a
 * feature Dashboard for construída. Por enquanto, só o essencial:
 * confirma sessão (o middleware já protege a rota, isso é defesa em
 * profundidade) e dá um jeito de sair.
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
    <div className="bg-background min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">MedFlow</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {user.name} · {user.roleName}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
