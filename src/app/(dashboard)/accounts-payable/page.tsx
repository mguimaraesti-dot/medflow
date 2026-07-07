import { getSessionUser } from "@/core/auth/session";
import { AccountsPayableScreen } from "@/features/accounts-payable/presentation/accounts-payable-screen";

export default async function AccountsPayablePage() {
  const user = await getSessionUser();

  // Sem <h1> nesta tela de propósito — o item ativo no menu lateral já
  // identifica "Contas a Pagar", repetir o título só ocupava espaço vertical
  // que a tabela poderia usar (Refinamento de Layout).
  return <AccountsPayableScreen permissions={user?.permissions ?? []} />;
}
