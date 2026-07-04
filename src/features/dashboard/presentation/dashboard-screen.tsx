"use client";

import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { CashRegisterStatusCard } from "@/features/cash-register/presentation/cash-register-status-card";
import { useDashboardSummary } from "./use-dashboard-summary";
import { AlertsBanner } from "./alerts-banner";
import { KpiCard } from "@/shared/components/kpi-card";
import { CashFlowChart } from "./cash-flow-chart";
import { RecentEntriesList } from "./recent-entries-list";
import { UpcomingDuesPlaceholderCard } from "./upcoming-dues-placeholder-card";
import { formatCurrencyBRL } from "@/shared/lib/format";

export function DashboardScreen({ permissions }: { permissions: string[] }) {
  const { data: summary, isLoading } = useDashboardSummary();

  const can = (permission: string) => permissions.includes(permission);

  return (
    <div className="space-y-6">
      <AlertsBanner />

      {isLoading && (
        <p className="text-muted-foreground text-sm">Carregando dashboard...</p>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Saldo atual"
              value={formatCurrencyBRL(summary.currentBalance)}
            />
            <KpiCard
              label="Receitas hoje"
              value={formatCurrencyBRL(summary.revenueToday)}
              tone="positive"
            />
            <KpiCard
              label="Despesas hoje"
              value={formatCurrencyBRL(summary.expensesToday)}
              tone="negative"
            />
            <KpiCard
              label="Resultado do dia"
              value={formatCurrencyBRL(summary.resultToday)}
              tone={Number(summary.resultToday) >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              label="Resultado do mês"
              value={formatCurrencyBRL(summary.resultMonth)}
              tone={Number(summary.resultMonth) >= 0 ? "positive" : "negative"}
            />
          </div>

          <CashRegisterStatusCard
            canOpen={can(PERMISSIONS.CASH_REGISTER_OPEN)}
            canClose={can(PERMISSIONS.CASH_REGISTER_CLOSE)}
            canReopen={can(PERMISSIONS.CASH_REGISTER_REOPEN)}
          />

          <CashFlowChart dailySeries={summary.dailySeries} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentEntriesList entries={summary.recentEntries} />
            <UpcomingDuesPlaceholderCard />
          </div>
        </>
      )}
    </div>
  );
}
