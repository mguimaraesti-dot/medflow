import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  SEVERITY_ICON_CLASSES,
  pendencySubtitle,
} from "./dashboard-overview-card";
import type { DashboardPendencyResponseDTO } from "../application/dtos/dashboard-overview.response-dto";

/**
 * "Precisa de atenção" — seção 2 do Dashboard mobile (Ajuste consolidado
 * v2). Mesmos dados e mesma lógica de rótulo/destino de
 * `DashboardOverviewCard` ("Tendências e Alertas" no desktop) — só o
 * layout muda pra caber sem cortar texto: cada alerta vira uma linha só
 * (ícone + título + descrição + "Resolver/Ver →" compacto), sem
 * inventar nenhuma pendência nova.
 */
export function DashboardMobileAlerts({
  pendencies,
}: {
  pendencies: DashboardPendencyResponseDTO[];
}) {
  if (pendencies.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Precisa de atenção
      </p>
      {pendencies.map((pendency) => (
        <div
          key={pendency.code}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3",
            pendency.severity === "critical" &&
              "border-destructive/30 bg-destructive/5",
            pendency.severity === "warning" &&
              "border-amber-500/30 bg-amber-500/5",
            pendency.severity === "info" && "border-blue-500/30 bg-blue-500/5",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              SEVERITY_ICON_CLASSES[pendency.severity],
            )}
          >
            {pendency.severity === "info" ? (
              <Info className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{pendency.title}</p>
            <p className="text-muted-foreground text-xs">
              {pendencySubtitle(pendency)}
            </p>
          </div>
          <Link
            href={pendency.href}
            className="text-primary shrink-0 text-xs font-semibold whitespace-nowrap"
          >
            {pendency.code === "REVERSED_ENTRIES_TODAY" ? "Ver" : "Resolver"} →
          </Link>
        </div>
      ))}
    </div>
  );
}
