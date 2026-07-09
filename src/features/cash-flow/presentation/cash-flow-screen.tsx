"use client";

import { useRef } from "react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { CashBalanceHeader } from "./cash-balance-header";
import {
  CashFlowEntryForm,
  type CashFlowEntryFormHandle,
} from "./cash-flow-entry-form";
import { CashFlowEntriesTable } from "./cash-flow-entries-table";
import { DailySummaryPanel } from "./daily-summary-panel";

export function CashFlowScreen({ permissions }: { permissions: string[] }) {
  const { data: today } = useCashRegisterToday();
  const isRegisterOpen = today?.status === "OPEN";
  const formRef = useRef<CashFlowEntryFormHandle>(null);

  const can = (permission: string) => permissions.includes(permission);
  const canCreateEntry = isRegisterOpen && can(PERMISSIONS.CASH_FLOW_CREATE);

  return (
    <div className="space-y-6">
      <CashBalanceHeader
        canOpen={can(PERMISSIONS.CASH_REGISTER_OPEN)}
        canClose={can(PERMISSIONS.CASH_REGISTER_CLOSE)}
        canReopen={can(PERMISSIONS.CASH_REGISTER_REOPEN)}
        canCreateEntry={canCreateEntry}
        onSelectType={(type) => formRef.current?.selectType(type)}
      />

      {isRegisterOpen && today ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <CashFlowEntryForm ref={formRef} disabled={!canCreateEntry} />
            <CashFlowEntriesTable
              cashRegisterDayId={today.id}
              isClosedToday={false}
              canReverse={can(PERMISSIONS.CASH_FLOW_REVERSE)}
            />
          </div>
          <DailySummaryPanel today={today} />
        </div>
      ) : (
        <>
          <CashFlowEntryForm ref={formRef} disabled={!canCreateEntry} />
          <CashFlowEntriesTable
            cashRegisterDayId={undefined}
            isClosedToday={today?.status === "CLOSED"}
            canReverse={can(PERMISSIONS.CASH_FLOW_REVERSE)}
          />
        </>
      )}
    </div>
  );
}
