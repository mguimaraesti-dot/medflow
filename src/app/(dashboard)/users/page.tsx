import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { UsersScreen } from "@/features/users/presentation/users-screen";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.permissions.includes(PERMISSIONS.USERS_MANAGE)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Usuários</h1>
      <UsersScreen currentUserId={user.id} />
    </div>
  );
}
