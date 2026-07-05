import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { SuppliersScreen } from "@/features/suppliers/presentation/suppliers-screen";

export default async function SuppliersPage() {
  const user = await getSessionUser();
  const canCreate = (user?.permissions ?? []).includes(
    PERMISSIONS.PAYABLE_CREATE,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fornecedores</h1>
      <SuppliersScreen canCreate={canCreate} />
    </div>
  );
}
