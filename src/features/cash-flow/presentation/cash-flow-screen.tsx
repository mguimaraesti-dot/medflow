"use client";

import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { CashRegisterStatusCard } from "@/features/cash-register/presentation/cash-register-status-card";
import { CashFlowEntryForm } from "./cash-flow-entry-form";
import { CashFlowEntriesTable } from "./cash-flow-entries-table";
import { CashFlowTimeline } from "./cash-flow-timeline";
import { RevenueByCategoryChart } from "./revenue-by-category-chart";
import { RevenueByHourChart } from "./revenue-by-hour-chart";
import { useCashFlowEntries } from "./use-cash-flow-entries";
import { useCashFlowInsights } from "./use-cash-flow-insights";
import { useUpcomingPayables } from "./use-upcoming-payables";
import { UpcomingDuesCard } from "@/shared/components/upcoming-dues-card";

export function CashFlowScreen({ permissions }: { permissions: string[] }) {
  const { data: today } = useCashRegisterToday();
  const { data: todayEntries } = useCashFlowEntries(
    { cashRegisterDayId: today?.id, pageSize: 100 },
    { enabled: Boolean(today?.id) },
  );
  const { data: insights } = useCashFlowInsights();
  const { data: upcomingPayables } = useUpcomingPayables();
  const isRegisterOpen = today?.status === "OPEN";

  const can = (permission: string) => permissions.includes(permission);

  return (
    <div className="space-y-6">
      <CashRegisterStatusCard
        canOpen={can(PERMISSIONS.CASH_REGISTER_OPEN)}
        canClose={can(PERMISSIONS.CASH_REGISTER_CLOSE)}
        canReopen={can(PERMISSIONS.CASH_REGISTER_REOPEN)}
      />

      <CashFlowEntryForm
        disabled={!isRegisterOpen || !can(PERMISSIONS.CASH_FLOW_CREATE)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowTimeline
          entries={todayEntries?.items ?? []}
          cashRegisterDay={today}
        />
        <UpcomingDuesCard payables={upcomingPayables ?? []} />
      </div>

      {insights && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueByCategoryChart byCategory={insights.byCategory} />
          <RevenueByHourChart byHour={insights.byHour} />
        </div>
      )}

      <CashFlowEntriesTable
        cashRegisterDayId={today?.id}
        canReverse={can(PERMISSIONS.CASH_FLOW_REVERSE)}
      />
    </div>
  );
}
