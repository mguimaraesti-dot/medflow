"use client";

import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { CashRegisterStatusCard } from "@/features/cash-register/presentation/cash-register-status-card";
import { CashFlowEntryForm } from "./cash-flow-entry-form";
import { CashFlowEntriesTable } from "./cash-flow-entries-table";
import { CashFlowTimeline } from "./cash-flow-timeline";
import { useCashFlowEntries } from "./use-cash-flow-entries";

export function CashFlowScreen({ permissions }: { permissions: string[] }) {
  const { data: today } = useCashRegisterToday();
  const { data: todayEntries } = useCashFlowEntries(
    { cashRegisterDayId: today?.id, pageSize: 100 },
    { enabled: Boolean(today?.id) },
  );
  const isRegisterOpen = today?.status === "OPEN";

  const can = (permission: string) => permissions.includes(permission);

  return (
    <div className="space-y-6">
      <CashRegisterStatusCard
        canOpen={can(PERMISSIONS.CASH_REGISTER_OPEN)}
        canClose={can(PERMISSIONS.CASH_REGISTER_CLOSE)}
        canReopen={can(PERMISSIONS.CASH_REGISTER_REOPEN)}
        canConfirmHandoff={can(PERMISSIONS.TREASURY_CONFIRM_HANDOFF)}
        canRejectConference={can(PERMISSIONS.TREASURY_REJECT_CONFERENCE)}
        hideConferenceActions
      />

      <CashFlowEntryForm
        disabled={!isRegisterOpen || !can(PERMISSIONS.CASH_FLOW_CREATE)}
      />

      <CashFlowTimeline
        entries={todayEntries?.items ?? []}
        cashRegisterDay={today}
      />

      <CashFlowEntriesTable
        cashRegisterDayId={today?.id}
        canReverse={can(PERMISSIONS.CASH_FLOW_REVERSE)}
      />
    </div>
  );
}
