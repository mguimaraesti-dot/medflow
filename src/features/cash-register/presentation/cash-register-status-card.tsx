"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  openCashRegisterSchema,
  type OpenCashRegisterInput,
} from "@/features/cash-register/application/dtos/open-cash-register.dto";
import { useCashRegisterToday } from "./use-cash-register-today";
import { useOpenCashRegister } from "./use-open-cash-register";
import { useCloseCashRegister } from "./use-close-cash-register";
import { ReopenRegisterDialog } from "./reopen-register-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CashRegisterStatusCard({
  canOpen,
  canClose,
  canReopen,
}: {
  canOpen: boolean;
  canClose: boolean;
  canReopen: boolean;
}) {
  const { data: today, isLoading } = useCashRegisterToday();
  const [serverError, setServerError] = useState<string | null>(null);

  const openCashRegister = useOpenCashRegister();
  const closeCashRegister = useCloseCashRegister();

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

  async function onClose() {
    setServerError(null);
    try {
      await closeCashRegister.mutateAsync();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível fechar o caixa.",
      );
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-sm">Carregando caixa...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Caixa do dia</span>
          {today && (
            <Badge variant={today.status === "OPEN" ? "default" : "secondary"}>
              {today.status === "OPEN" ? "Aberto" : "Fechado"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!today && (
          <form
            onSubmit={handleSubmit(onOpen)}
            className="flex flex-wrap items-end gap-3"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Saldo inicial (opcional)</Label>
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
        )}

        {today && (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Saldo inicial</dt>
              <dd className="font-medium">
                {formatCurrencyBRL(today.openingBalance)}
              </dd>
            </div>
            {today.status === "CLOSED" && (
              <>
                <div>
                  <dt className="text-muted-foreground">Entradas</dt>
                  <dd className="font-medium">
                    {formatCurrencyBRL(today.totalIn ?? "0")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saídas</dt>
                  <dd className="font-medium">
                    {formatCurrencyBRL(today.totalOut ?? "0")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saldo final</dt>
                  <dd className="font-medium">
                    {formatCurrencyBRL(today.closingBalance ?? "0")}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-muted-foreground">Aberto em</dt>
              <dd className="font-medium">
                {formatDateTimeBR(today.openedAt)}
              </dd>
            </div>
          </dl>
        )}

        {today?.status === "OPEN" && (
          <Button
            type="button"
            variant="destructive"
            disabled={!canClose || closeCashRegister.isPending}
            onClick={onClose}
          >
            {closeCashRegister.isPending ? "Fechando..." : "Fechar caixa"}
          </Button>
        )}

        {today?.status === "CLOSED" && canReopen && (
          <ReopenRegisterDialog cashRegisterDayId={today.id} />
        )}

        {serverError && (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
