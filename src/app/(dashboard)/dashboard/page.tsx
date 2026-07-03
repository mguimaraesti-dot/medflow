import { getSessionUser } from "@/core/auth/session";

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Bem-vindo, {user?.name}!</h1>
      <p className="text-muted-foreground text-sm">
        Este é um placeholder — confirma que login, sessão e RBAC estão
        funcionando. O Dashboard financeiro de verdade (saldo, KPIs, gráfico)
        entra quando a feature Fluxo de Caixa existir.
      </p>
    </div>
  );
}
