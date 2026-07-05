import { Settings } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <div className="rounded-lg border p-6">
        <EmptyState
          icon={Settings}
          title="Em breve."
          description="Configurações da organização ainda não têm uma tela dedicada."
        />
      </div>
    </div>
  );
}
