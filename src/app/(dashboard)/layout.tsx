import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { LogoutButton } from "@/features/auth/presentation/logout-button";
import { ThemeToggle } from "@/shared/components/theme-toggle";

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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-4">
          <span className="font-semibold">MedFlow</span>
          <Link
            href="/cash-flow"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Fluxo de Caixa
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {user.name} · {user.roleName}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
