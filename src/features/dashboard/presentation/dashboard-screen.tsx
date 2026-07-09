"use client";

import { DashboardHeader } from "./dashboard-header";
import { DashboardKpiRow } from "./dashboard-kpi-row";
import { DashboardPendenciesCard } from "./dashboard-pendencies-card";
import { DashboardFinancialFlowCard } from "./dashboard-financial-flow-card";
import { DashboardAgendaCard } from "./dashboard-agenda-card";
import { DashboardAvailabilityCard } from "./dashboard-availability-card";
import { DashboardTimelineCard } from "./dashboard-timeline-card";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { useDashboardOverview } from "./use-dashboard-overview";
import { Skeleton } from "@/shared/ui/skeleton";

export function DashboardScreen({ permissions }: { permissions: string[] }) {
  const { data: overview, isLoading } = useDashboardOverview();

  if (isLoading || !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardPendenciesCard pendencies={overview.pendencies} />
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
        <DashboardAgendaCard
          dueTodayCount={overview.dueTodayCount}
          overdueCount={overview.overdueCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <DashboardAvailabilityCard
          cashBalance={overview.cashBalance}
          safeBalance={overview.safeBalance}
          availableTotal={overview.availableTotal}
        />
        <DashboardTimelineCard events={overview.timeline} />
      </div>

      <DashboardQuickActions permissions={permissions} />
    </div>
  );
}
