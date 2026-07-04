"use client";

import { AlertTriangle, Info, Clock } from "lucide-react";
import { useDashboardAlerts } from "./use-dashboard-alerts";
import { cn } from "@/shared/lib/utils";

export function AlertsBanner() {
  const { data, isLoading } = useDashboardAlerts();

  if (isLoading) return null;

  const alerts = data?.alerts ?? [];

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.code}
          className={cn(
            "flex items-center gap-2 rounded-md border p-3 text-sm",
            alert.severity === "warning"
              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              : "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
          )}
        >
          {alert.severity === "warning" ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <Info className="h-4 w-4 shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      ))}

      <div className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-sm opacity-60">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Contas vencidas — disponível a partir da Sprint 2.</span>
      </div>
    </div>
  );
}
