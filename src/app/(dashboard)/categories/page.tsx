import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { CategoriesScreen } from "@/features/categories/presentation/categories-screen";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  const canCreate = (user?.permissions ?? []).includes(
    PERMISSIONS.PAYABLE_CREATE,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Categorias</h1>
      <CategoriesScreen canCreate={canCreate} />
    </div>
  );
}
