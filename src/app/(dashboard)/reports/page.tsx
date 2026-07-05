import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Relatórios</h1>
      <div className="rounded-lg border p-6">
        <EmptyState
          icon={BarChart3}
          title="Relatórios chegam na Sprint 3."
          description="Fechamento diário e relatórios financeiros estão no roadmap — ainda não implementados."
        />
      </div>
    </div>
  );
}
