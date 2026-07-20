"use client";

import { useRef, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { CashBalanceHeader } from "./cash-balance-header";
import {
  CashFlowEntryForm,
  type CashFlowEntryFormHandle,
} from "./cash-flow-entry-form";
import { CashFlowEntrySheet } from "./cash-flow-entry-sheet";
import { CashFlowEntriesTable } from "./cash-flow-entries-table";
import { DailySummaryPanel } from "./daily-summary-panel";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

export function CashFlowScreen({ permissions }: { permissions: string[] }) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const { data: today } = useCashRegisterToday();
  const isRegisterOpen = today?.status === "OPEN";
  const formRef = useRef<CashFlowEntryFormHandle>(null);
  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [entrySheetType, setEntrySheetType] = useState<"IN" | "OUT">("IN");

  const can = (permission: string) => permissions.includes(permission);
  const canCreateEntry = isRegisterOpen && can(PERMISSIONS.CASH_FLOW_CREATE);

  function openEntrySheet(type: "IN" | "OUT") {
    setEntrySheetType(type);
    setEntrySheetOpen(true);
  }

  return (
    <div className={cn("space-y-4", isMobile && "pb-24")}>
      <CashBalanceHeader
        canOpen={can(PERMISSIONS.CASH_REGISTER_OPEN)}
        canClose={can(PERMISSIONS.CASH_REGISTER_CLOSE)}
        canReopen={can(PERMISSIONS.CASH_REGISTER_REOPEN)}
        canCreateEntry={canCreateEntry}
        onSelectType={(type) => formRef.current?.selectType(type)}
      />

      <div className="space-y-4">
        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
          {!isMobile && (
            <div className="min-w-0 lg:flex-[5]">
              <CashFlowEntryForm ref={formRef} disabled={!canCreateEntry} />
            </div>
          )}
          <div className="min-w-0 lg:flex-[1]">
            <DailySummaryPanel today={today} />
          </div>
        </div>
        <CashFlowEntriesTable
          cashRegisterDayId={isRegisterOpen ? today?.id : undefined}
          isClosedToday={today?.status === "CLOSED"}
          canReverse={can(PERMISSIONS.CASH_FLOW_REVERSE)}
        />
      </div>

      {isMobile && isRegisterOpen && (
        <div className="bg-background fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t p-3">
          <Button
            type="button"
            disabled={!canCreateEntry}
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => openEntrySheet("IN")}
          >
            <ArrowDownCircle className="h-4 w-4" />
            Registrar Entrada
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canCreateEntry}
            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive flex-1"
            onClick={() => openEntrySheet("OUT")}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Saída
          </Button>
        </div>
      )}

      <CashFlowEntrySheet
        open={entrySheetOpen}
        onOpenChange={setEntrySheetOpen}
        initialType={entrySheetType}
        disabled={!canCreateEntry}
      />
    </div>
  );
}
