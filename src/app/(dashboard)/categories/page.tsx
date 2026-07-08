import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { CategoriesScreen } from "@/features/categories/presentation/categories-screen";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  const canCreate = (user?.permissions ?? []).includes(
    PERMISSIONS.PAYABLE_CREATE,
  );

  return <CategoriesScreen canCreate={canCreate} />;
}
