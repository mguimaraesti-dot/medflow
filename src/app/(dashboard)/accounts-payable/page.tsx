import { getSessionUser } from "@/core/auth/session";
import { AccountsPayableScreen } from "@/features/accounts-payable/presentation/accounts-payable-screen";

export default async function AccountsPayablePage() {
  const user = await getSessionUser();

  // Título já é renderizado pela própria AccountsPayableScreen — um <h1>
  // aqui duplicava "Contas a Pagar" na tela (ver ajuste de UX/Design Pass).
  return <AccountsPayableScreen permissions={user?.permissions ?? []} />;
}
