import Link from "next/link";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { DashboardPendencyResponseDTO } from "../application/dtos/dashboard-overview.response-dto";

const SEVERITY_ICON_CLASSES: Record<
  DashboardPendencyResponseDTO["severity"],
  string
> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-500",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

function pendencySubtitle(pendency: DashboardPendencyResponseDTO): string {
  switch (pendency.code) {
    case "OVERDUE_PAYABLES":
    case "DUE_TODAY_PAYABLES":
      return `Total: ${formatCurrencyBRL(pendency.amount ?? "0")}`;
    case "PENDING_TREASURY_CONFIRMATION":
      return `${pendency.count === 1 ? "1 recolhimento" : `${pendency.count} recolhimentos`} — ${formatCurrencyBRL(pendency.amount ?? "0")}`;
    case "CASH_REGISTER_NOT_OPENED":
      return "Aguardando abertura";
    case "REVERSED_ENTRIES_TODAY":
      return "Verifique os motivos no histórico";
    default:
      return "";
  }
}

export function DashboardPendenciesCard({
  pendencies,
}: {
  pendencies: DashboardPendencyResponseDTO[];
}) {
  return (
    <Card className="flex flex-col gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-semibold">Pendências</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 px-4">
        {pendencies.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma pendência no momento.
          </p>
        ) : (
          pendencies.map((pendency) => (
            <div
              key={pendency.code}
              className="bg-muted/40 flex items-center gap-3 rounded-lg border p-3"
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
                <p className="truncate text-sm font-semibold">
                  {pendency.title}
                </p>
                <p className="text-muted-foreground text-xs">
                  {pendencySubtitle(pendency)}
                </p>
              </div>
              <Link
                href={pendency.href}
                className="text-primary bg-primary/10 hover:bg-primary/20 flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold"
              >
                Resolver <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
