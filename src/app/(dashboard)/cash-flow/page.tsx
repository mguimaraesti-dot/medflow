import { getSessionUser } from "@/core/auth/session";
import { CashFlowScreen } from "@/features/cash-flow/presentation/cash-flow-screen";

export default async function CashFlowPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fluxo de Caixa</h1>
      <CashFlowScreen permissions={user?.permissions ?? []} />
    </div>
  );
}
