"use client";

import {
  Activity,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { CashRegisterStatusCard } from "@/features/cash-register/presentation/cash-register-status-card";
import { useDashboardSummary } from "./use-dashboard-summary";
import { AlertsBanner } from "./alerts-banner";
import { KpiCard } from "@/shared/components/kpi-card";
import { CashFlowChart } from "./cash-flow-chart";
import { RecentEntriesList } from "./recent-entries-list";
import { useUpcomingPayables } from "./use-upcoming-payables";
import { UpcomingDuesCard } from "@/shared/components/upcoming-dues-card";
import { formatCurrencyBRL } from "@/shared/lib/format";

export function DashboardScreen({ permissions }: { permissions: string[] }) {
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: upcomingPayables } = useUpcomingPayables();

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
              icon={Wallet}
              iconTone="blue"
            />
            <KpiCard
              label="Receitas hoje"
              value={formatCurrencyBRL(summary.revenueToday)}
              tone="positive"
              icon={TrendingUp}
              iconTone="green"
            />
            <KpiCard
              label="Despesas hoje"
              value={formatCurrencyBRL(summary.expensesToday)}
              tone="negative"
              icon={TrendingDown}
              iconTone="red"
            />
            <KpiCard
              label="Resultado do dia"
              value={formatCurrencyBRL(summary.resultToday)}
              tone={Number(summary.resultToday) >= 0 ? "positive" : "negative"}
              icon={Activity}
              iconTone={Number(summary.resultToday) >= 0 ? "green" : "red"}
            />
            <KpiCard
              label="Resultado do mês"
              value={formatCurrencyBRL(summary.resultMonth)}
              tone={Number(summary.resultMonth) >= 0 ? "positive" : "negative"}
              icon={BarChart3}
              iconTone={Number(summary.resultMonth) >= 0 ? "green" : "red"}
            />
          </div>

          <CashRegisterStatusCard
            canOpen={can(PERMISSIONS.CASH_REGISTER_OPEN)}
            canClose={can(PERMISSIONS.CASH_REGISTER_CLOSE)}
            canReopen={can(PERMISSIONS.CASH_REGISTER_REOPEN)}
            canConfirmHandoff={can(PERMISSIONS.TREASURY_CONFIRM_HANDOFF)}
            canRejectConference={can(PERMISSIONS.TREASURY_REJECT_CONFERENCE)}
          />

          <CashFlowChart dailySeries={summary.dailySeries} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentEntriesList entries={summary.recentEntries} />
            <UpcomingDuesCard payables={upcomingPayables ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
