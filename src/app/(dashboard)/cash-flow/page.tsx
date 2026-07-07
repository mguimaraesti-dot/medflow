import { getSessionUser } from "@/core/auth/session";
import { CashFlowScreen } from "@/features/cash-flow/presentation/cash-flow-screen";

export default async function CashFlowPage() {
  const user = await getSessionUser();

  // Sem <h1> nesta tela de propósito — o item ativo no menu lateral já
  // identifica "Caixa Recepção", repetir o título só ocupava espaço vertical
  // que o operador poderia usar (Refinamento UX/UI Caixa Recepção).
  return <CashFlowScreen permissions={user?.permissions ?? []} />;
}
