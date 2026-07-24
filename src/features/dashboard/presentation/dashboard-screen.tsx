"use client";

import { DashboardHeader } from "./dashboard-header";
import { DashboardKpiRow } from "./dashboard-kpi-row";
import { DashboardOverviewCard } from "./dashboard-overview-card";
import { DashboardFinancialFlowCard } from "./dashboard-financial-flow-card";
import { DashboardAgendaCard } from "./dashboard-agenda-card";
import { DashboardTimelineCard } from "./dashboard-timeline-card";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { DashboardMobileAlerts } from "./dashboard-mobile-alerts";
import { DashboardMobilePosition } from "./dashboard-mobile-position";
import { DashboardMobileTodayFlow } from "./dashboard-mobile-today-flow";
import { DashboardMobilePayables } from "./dashboard-mobile-payables";
import { DashboardMobileTimeline } from "./dashboard-mobile-timeline";
import { useDashboardOverview } from "./use-dashboard-overview";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { Skeleton } from "@/shared/ui/skeleton";

export function DashboardScreen({ permissions }: { permissions: string[] }) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const { data: overview, isLoading } = useDashboardOverview();

  if (isLoading || !overview) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Mobile: consolidado (Ajuste layout mobile Dashboard) — mesmas fontes
  // de dados do desktop (`overview`, `useDashboardAgendaDueToday`),
  // nenhum cálculo novo, só cada número aparecendo uma vez em vez de
  // repetido em 3-4 blocos. Desktop abaixo continua 100% como estava.
  if (isMobile) {
    return (
      <div className="space-y-4">
        <DashboardHeader
          cashRegisterStatus={overview.cashRegisterStatus}
          overdueCount={overview.overdueCount}
          pendingConfirmationCount={overview.pendingConfirmationCount}
          hideTitle
          hideExport
        />
        <DashboardMobileAlerts pendencies={overview.pendencies} />
        <DashboardMobilePosition
          cashBalance={overview.cashBalance}
          safeBalance={overview.safeBalance}
          availableTotal={overview.availableTotal}
        />
        <DashboardMobileTodayFlow
          receivedTodayTotal={overview.receivedTodayTotal}
          receivedTodayCash={overview.receivedTodayCash}
          receivedTodayPix={overview.receivedTodayPix}
          receivedTodayCount={overview.receivedTodayCount}
          paidTodayAmount={overview.paidTodayAmount}
          paidTodayCount={overview.paidTodayCount}
        />
        <DashboardMobilePayables
          dueTodayAmount={overview.dueTodayAmount}
          dueTodayCount={overview.dueTodayCount}
          overdueAmount={overview.overdueAmount}
          overdueCount={overview.overdueCount}
        />
        <DashboardMobileTimeline events={overview.timeline} />
        <DashboardQuickActions permissions={permissions} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DashboardHeader
        cashRegisterStatus={overview.cashRegisterStatus}
        overdueCount={overview.overdueCount}
        pendingConfirmationCount={overview.pendingConfirmationCount}
      />

      <DashboardKpiRow
        cashBalance={overview.cashBalance}
        safeBalance={overview.safeBalance}
        dueTodayAmount={overview.dueTodayAmount}
        dueTodayCount={overview.dueTodayCount}
        overdueAmount={overview.overdueAmount}
        overdueCount={overview.overdueCount}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="flex flex-col gap-3">
          <DashboardOverviewCard
            cashBalance={overview.cashBalance}
            safeBalance={overview.safeBalance}
            availableTotal={overview.availableTotal}
            pendencies={overview.pendencies}
          />
          <DashboardAgendaCard
            dueTodayCount={overview.dueTodayCount}
            overdueCount={overview.overdueCount}
          />
        </div>
        <DashboardFinancialFlowCard
          receivedTodayTotal={overview.receivedTodayTotal}
          receivedTodayCash={overview.receivedTodayCash}
          receivedTodayPix={overview.receivedTodayPix}
          receivedTodayCount={overview.receivedTodayCount}
          cashBalance={overview.cashBalance}
          safeBalance={overview.safeBalance}
          paidTodayAmount={overview.paidTodayAmount}
          paidTodayCount={overview.paidTodayCount}
          availableTotal={overview.availableTotal}
        />
        <DashboardTimelineCard events={overview.timeline} />
      </div>

      <DashboardQuickActions permissions={permissions} />
    </div>
  );
}
