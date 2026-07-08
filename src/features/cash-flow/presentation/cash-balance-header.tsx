"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import {
  openCashRegisterSchema,
  type OpenCashRegisterInput,
} from "@/features/cash-register/application/dtos/open-cash-register.dto";
import { useCashRegisterToday } from "@/features/cash-register/presentation/use-cash-register-today";
import { useOpenCashRegister } from "@/features/cash-register/presentation/use-open-cash-register";
import { CloseRegisterDialog } from "@/features/cash-register/presentation/close-register-dialog";
import { ReopenRegisterDialog } from "@/features/cash-register/presentation/reopen-register-dialog";
import { ApiError } from "@/shared/lib/api-client";
import {
  formatCurrencyBRL,
  formatDateOnlyLocalBR,
  formatTimeBR,
} from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Cabeçalho da Caixa Recepção: Saldo Atual em destaque + Status do Caixa
 * bem evidente (Refinamento UX/UI). Substitui o uso de
 * `CashRegisterStatusCard` (compartilhado com o Dashboard) só nesta
 * tela — reaproveita os mesmos hooks/dialogs, sem duplicar mutações.
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
  const [serverError, setServerError] = useState<string | null>(null);
  const openCashRegister = useOpenCashRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpenCashRegisterInput>({
    resolver: zodResolver(openCashRegisterSchema),
  });

  async function onOpen(values: OpenCashRegisterInput) {
    setServerError(null);
    try {
      await openCashRegister.mutateAsync(values);
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível abrir o caixa.",
      );
    }
  }

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!today) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-6">
          <form
            onSubmit={handleSubmit(onOpen)}
            className="flex flex-wrap items-end gap-3"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Saldo inicial</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                min={0}
                {...register("openingBalance", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              />
              {errors.openingBalance && (
                <p className="text-destructive text-sm">
                  {errors.openingBalance.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={!canOpen || openCashRegister.isPending}
            >
              {openCashRegister.isPending ? "Abrindo..." : "Abrir caixa"}
            </Button>
          </form>
          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const resultToday = (
    Number(today.totalIn ?? "0") - Number(today.totalOut ?? "0")
  ).toFixed(2);
  const isOpen = today.status === "OPEN";
  // Fechado, a tela "zera" (PDV) — o saldo real de fechamento continua
  // disponível no Histórico e no card do Dashboard, só não repete aqui.
  const currentBalance = isOpen
    ? (Number(today.openingBalance) + Number(resultToday)).toFixed(2)
    : "0";

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-6 p-8">
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
                  isOpen ? "bg-green-500" : "bg-destructive",
                )}
              />
              {isOpen ? "Caixa Aberto" : "Caixa Fechado"}
            </span>
            {isOpen ? (
              <p className="text-muted-foreground mt-1 text-sm">
                Aberto hoje às {formatTimeBR(today.openedAt)}
                <br />
                por {today.openedByUserName}
              </p>
            ) : (
              today.closedAt && (
                <p className="text-muted-foreground mt-1 text-sm">
                  Último fechamento
                  <br />
                  {formatDateOnlyLocalBR(today.closedAt)} •{" "}
                  {formatTimeBR(today.closedAt)}
                  <br />
                  por {today.closedByUserName}
                </p>
              )
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
            </>
          )}
          {isOpen && <CloseRegisterDialog disabled={!canClose} />}
          {today.status === "CLOSED" && canReopen && (
            <ReopenRegisterDialog cashRegisterDayId={today.id} />
          )}
        </div>
      </CardContent>

      {serverError && (
        <p className="text-destructive px-6 pb-4 text-sm" role="alert">
          {serverError}
        </p>
      )}
    </Card>
  );
}
