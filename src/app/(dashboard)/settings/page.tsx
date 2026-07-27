import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { OrganizationSettingsForm } from "@/features/organization-settings/presentation/organization-settings-form";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.permissions.includes(PERMISSIONS.ORGANIZATION_SETTINGS_MANAGE)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <OrganizationSettingsForm />
    </div>
  );
}
