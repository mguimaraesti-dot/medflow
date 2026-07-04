import { getSessionUser } from "@/core/auth/session";
import { AccountsPayableScreen } from "@/features/accounts-payable/presentation/accounts-payable-screen";

export default async function AccountsPayablePage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Contas a Pagar</h1>
      <AccountsPayableScreen permissions={user?.permissions ?? []} />
    </div>
  );
}
