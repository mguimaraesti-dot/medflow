"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  openCashRegisterSchema,
  type OpenCashRegisterInput,
} from "@/features/cash-register/application/dtos/open-cash-register.dto";
import { useCashRegisterToday } from "./use-cash-register-today";
import { useOpenCashRegister } from "./use-open-cash-register";
import { CloseRegisterDialog } from "./close-register-dialog";
import { ConfirmHandoffDialog } from "./confirm-handoff-dialog";
import { RejectConferenceDialog } from "./reject-conference-dialog";
import { ReopenRegisterDialog } from "./reopen-register-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { KpiCard } from "@/shared/components/kpi-card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";

export function CashRegisterStatusCard({
  canOpen,
  canClose,
  canReopen,
  canConfirmHandoff,
  canRejectConference,
}: {
  canOpen: boolean;
  canClose: boolean;
  canReopen: boolean;
  canConfirmHandoff: boolean;
  canRejectConference: boolean;
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
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
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
  const currentBalance =
    today.status === "OPEN"
      ? (Number(today.openingBalance) + Number(resultToday)).toFixed(2)
      : (today.closingBalance ?? today.openingBalance);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Saldo inicial"
          value={formatCurrencyBRL(today.openingBalance)}
          icon={Wallet}
        />
        <KpiCard
          label="Entradas"
          value={formatCurrencyBRL(today.totalIn ?? "0")}
          tone="positive"
          icon={TrendingUp}
        />
        <KpiCard
          label="Saídas"
          value={formatCurrencyBRL(today.totalOut ?? "0")}
          tone="negative"
          icon={TrendingDown}
        />
        <KpiCard
          label="Saldo atual"
          value={formatCurrencyBRL(currentBalance)}
          icon={CircleDollarSign}
        />
        <Card className="py-4">
          <CardContent className="flex h-full flex-col justify-between gap-2 px-4">
            <span className="text-muted-foreground text-sm">Status</span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant={
                  today.status === "OPEN"
                    ? "default"
                    : today.status === "PENDING_CONFERENCE"
                      ? "outline"
                      : "secondary"
                }
                className="text-sm"
              >
                {today.status === "OPEN" && "Caixa Aberto"}
                {today.status === "PENDING_CONFERENCE" &&
                  "Aguardando conferência"}
                {today.status === "CLOSED" && "Caixa Fechado"}
              </Badge>
              {today.status === "OPEN" && (
                <CloseRegisterDialog disabled={!canClose} />
              )}
              {today.status === "PENDING_CONFERENCE" && (
                <div className="flex flex-wrap gap-2">
                  {canRejectConference && <RejectConferenceDialog />}
                  {canConfirmHandoff && (
                    <ConfirmHandoffDialog
                      suggestedAmount={
                        today.countedAmount
                          ? Number(today.countedAmount)
                          : undefined
                      }
                    />
                  )}
                </div>
              )}
              {today.status === "CLOSED" && canReopen && (
                <ReopenRegisterDialog cashRegisterDayId={today.id} />
              )}
            </div>
            {today.status === "PENDING_CONFERENCE" && (
              <p className="text-muted-foreground text-xs">
                Contado: {formatCurrencyBRL(today.countedAmount ?? "0")}
                {today.difference && (
                  <>
                    {" "}
                    · Diferença:{" "}
                    <span
                      className={
                        Number(today.difference) < 0
                          ? "text-destructive"
                          : "text-success"
                      }
                    >
                      {formatCurrencyBRL(today.difference)}
                    </span>
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {serverError && (
        <p className="text-destructive text-sm" role="alert">
          {serverError}
        </p>
      )}
    </div>
  );
}
