import { OrganizationSettingsForm } from "@/features/organization-settings/presentation/organization-settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <OrganizationSettingsForm />
    </div>
  );
}
