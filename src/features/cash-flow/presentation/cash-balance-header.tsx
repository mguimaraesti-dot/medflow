"use client";

import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { usePreviousDayOpenRegister } from "@/features/cash-register/presentation/use-previous-day-open-register";
import { OpenRegisterDialog } from "@/features/cash-register/presentation/open-register-dialog";
import { CloseRegisterDialog } from "@/features/cash-register/presentation/close-register-dialog";
import { ReopenRegisterDialog } from "@/features/cash-register/presentation/reopen-register-dialog";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatDateOnlyLocalBR,
  formatTimeBR,
} from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Cabeçalho da Caixa Recepção: Saldo Atual em destaque + Status do Caixa
 * bem evidente (Refinamento UX/UI). Três estados possíveis, nunca
 * misturados: nunca aberto hoje (`OpenRegisterDialog`, sem
 * justificativa), aberto (`CloseRegisterDialog`), fechado hoje
 * (`ReopenRegisterDialog`, com justificativa — fluxo excepcional,
 * distinto da abertura normal).
 */
export function CashBalanceHeader({
  canOpen,
  canClose,
  canReopen,
  canCreateEntry,
  onSelectType,
}: {
  canOpen: boolean;
  canClose: boolean;
  canReopen: boolean;
  canCreateEntry: boolean;
  /** Atalho pro formulário (sempre visível, mais abaixo) — não abre um modal novo, só rola e foca (Refinamento PDV). */
  onSelectType: (type: "IN" | "OUT") => void;
}) {
  const { data: today, isLoading } = useCashRegisterToday();
  const { data: previousDayOpen } = usePreviousDayOpenRegister();

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const isOpen = today?.status === "OPEN";
  const closedToday = today?.status === "CLOSED";
  const hasPreviousDayOpen = Boolean(previousDayOpen);

  const resultToday = (
    Number(today?.totalIn ?? "0") - Number(today?.totalOut ?? "0")
  ).toFixed(2);
  // Fechado (ou nunca aberto hoje), a tela "zera" (PDV) — o saldo real
  // de fechamento continua disponível no Histórico e no card do
  // Dashboard, só não repete aqui.
  const currentBalance = isOpen
    ? (Number(today.openingBalance) + Number(resultToday)).toFixed(2)
    : "0";

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div>
          <p className="text-muted-foreground text-sm">Saldo Atual</p>
          <p className="text-5xl font-bold tracking-tight">
            {formatCurrencyBRL(currentBalance)}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="flex items-center justify-end gap-1.5 text-base font-semibold">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  isOpen
                    ? "bg-green-500"
                    : hasPreviousDayOpen
                      ? "bg-amber-500"
                      : "bg-destructive",
                )}
              />
              {isOpen
                ? "Caixa Aberto"
                : hasPreviousDayOpen
                  ? "Caixa aberto (dia anterior)"
                  : "Caixa Fechado"}
            </span>
            {hasPreviousDayOpen && previousDayOpen && (
              <p className="text-muted-foreground mt-1 text-sm">
                Caixa do dia {formatDateOnlyBR(previousDayOpen.date)} continua
                aberto.
                <br />
                Feche-o antes de abrir um novo caixa.
              </p>
            )}
            {isOpen && today && today.reopenCount > 0 && today.reopenedAt && (
              <p className="text-muted-foreground mt-1 text-sm">
                Reaberto hoje às {formatTimeBR(today.reopenedAt)}
                <br />
                por {today.reopenedByUserName}
              </p>
            )}
            {isOpen && today && today.reopenCount === 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                Aberto hoje às {formatTimeBR(today.openedAt)}
                <br />
                por {today.openedByUserName}
              </p>
            )}
            {closedToday && today?.closedAt && (
              <p className="text-muted-foreground mt-1 text-sm">
                Último fechamento
                <br />
                {formatDateOnlyLocalBR(today.closedAt)} •{" "}
                {formatTimeBR(today.closedAt)}
                <br />
                por {today.closedByUserName}
              </p>
            )}
            {!today && !hasPreviousDayOpen && (
              <p className="text-muted-foreground mt-1 text-sm">
                Nenhum caixa aberto hoje.
              </p>
            )}
          </div>

          {isOpen && (
            <>
              <Button
                type="button"
                disabled={!canCreateEntry}
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onSelectType("IN")}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Registrar Entrada
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canCreateEntry}
                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onSelectType("OUT")}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Registrar Saída
              </Button>
              <CloseRegisterDialog disabled={!canClose} />
            </>
          )}
          {hasPreviousDayOpen && !isOpen && (
            <CloseRegisterDialog disabled={!canClose} />
          )}
          {!today && !hasPreviousDayOpen && (
            <OpenRegisterDialog disabled={!canOpen} />
          )}
          {closedToday && canReopen && !hasPreviousDayOpen && (
            <ReopenRegisterDialog cashRegisterDayId={today.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
