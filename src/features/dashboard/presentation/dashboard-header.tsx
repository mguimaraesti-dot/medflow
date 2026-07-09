"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import { formatDateOnlyLocalBR } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { DashboardCashRegisterStatus } from "../domain/dashboard-overview.entity";

const REGISTER_STATUS_LABEL: Record<DashboardCashRegisterStatus, string> = {
  OPEN: "Caixa Aberto",
  CLOSED: "Caixa Fechado",
  NOT_OPENED: "Caixa não aberto",
};

type PillDot = "green" | "yellow" | "red" | "neutral";

const DOT_CLASSES: Record<PillDot, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  neutral: "bg-muted-foreground",
};

function StatusPill({
  dot,
  children,
}: {
  dot: PillDot;
  children: React.ReactNode;
}) {
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASSES[dot])}
      />
      {children}
    </span>
  );
}

export function DashboardHeader({
  cashRegisterStatus,
  overdueCount,
  pendingConfirmationCount,
}: {
  cashRegisterStatus: DashboardCashRegisterStatus;
  overdueCount: number;
  pendingConfirmationCount: number;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Centro de Controle Financeiro da Clínica
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <StatusPill
          dot={
            cashRegisterStatus === "OPEN"
              ? "green"
              : cashRegisterStatus === "CLOSED"
                ? "neutral"
                : "red"
          }
        >
          {REGISTER_STATUS_LABEL[cashRegisterStatus]}
        </StatusPill>
        <StatusPill dot={pendingConfirmationCount > 0 ? "yellow" : "green"}>
          {pendingConfirmationCount > 0
            ? "Confirmação pendente"
            : "Cofre Conferido"}
        </StatusPill>
        {overdueCount > 0 && (
          <StatusPill dot="red">
            {overdueCount === 1
              ? "1 Conta Vencida"
              : `${overdueCount} Contas Vencidas`}
          </StatusPill>
        )}
        <span className="text-muted-foreground hidden text-xs sm:inline">
          {formatDateOnlyLocalBR(new Date())}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info("Exportação ainda não disponível nesta versão.")
          }
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
}
