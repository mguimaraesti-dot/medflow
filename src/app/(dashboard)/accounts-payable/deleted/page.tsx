import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { DeletedAccountsPayableScreen } from "@/features/accounts-payable/presentation/deleted-accounts-payable-screen";

export default async function DeletedAccountsPayablePage() {
  const user = await getSessionUser();

  if (!user?.permissions.includes(PERMISSIONS.PAYABLE_DELETE)) {
    redirect("/accounts-payable");
  }

  return <DeletedAccountsPayableScreen />;
}
