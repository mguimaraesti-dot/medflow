"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import {
  closeCashRegisterSchema,
  type CloseCashRegisterInput,
} from "@/features/cash-register/application/dtos/close-cash-register.dto";
import { useCloseCashRegister } from "./use-close-cash-register";
import { useCashRegisterToday } from "./use-cash-register-today";
import { ApiError } from "@/shared/lib/api-client";
import { CurrencyInput } from "@/shared/components/currency-input";
import { Field } from "@/shared/components/detail-field";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

/** Diferença "pequena" (amarelo) até este valor — acima disso vira vermelho. Ajustável, não veio de um número exato do usuário. */
const SMALL_DIFFERENCE_THRESHOLD = 5;

/**
 * Fechar caixa exige prestação de contas: a secretária vê o Resumo do
 * Caixa (só aqui, não durante o expediente — Refinamento PDV), informa
 * o valor contado e o caixa é encerrado imediatamente (`CLOSED`, sem
 * estado intermediário) — a secretária tem autonomia de reabrir depois
 * (com justificativa) se precisar. Componente compartilhado com o
 * Dashboard (via `CashRegisterStatusCard`).
 */
export function CloseRegisterDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const closeCashRegister = useCloseCashRegister();
  const { data: today } = useCashRegisterToday();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CloseCashRegisterInput>({
    resolver: zodResolver(closeCashRegisterSchema),
  });

  const countedAmount = watch("countedAmount");

  async function onSubmit(values: CloseCashRegisterInput) {
    setServerError(null);
    try {
      await closeCashRegister.mutateAsync(values);
      setOpen(false);
      reset();
      toast.success("✓ Caixa encerrado com sucesso");
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível fechar o caixa.",
      );
    }
  }

  const openingBalance = Number(today?.openingBalance ?? 0);
  const cashIn = Number(today?.cashIn ?? 0);
  const totalIn = Number(today?.totalIn ?? 0);
  const pixIn = totalIn - cashIn;
  const cashOut = Number(today?.totalOut ?? 0);
  const expectedCash = Number(today?.expectedCashAmount ?? 0);

  const hasCountedInput = countedAmount !== undefined && countedAmount !== null;
  const difference = hasCountedInput ? countedAmount - expectedCash : 0;
  const differenceTone = !hasCountedInput
    ? "neutral"
    : Math.abs(difference) < 0.01
      ? "green"
      : Math.abs(difference) <= SMALL_DIFFERENCE_THRESHOLD
        ? "yellow"
        : "red";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-11 rounded-xl transition-colors duration-200"
          disabled={disabled}
        >
          <Lock className="h-4 w-4" />
          Fechar Caixa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
            <DialogDescription>
              Confira o resumo do dia e informe o dinheiro contado na gaveta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">Resumo do Caixa</p>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Saldo Inicial"
                  value={formatCurrencyBRL(openingBalance)}
                />
                <Field
                  label="Entradas em Dinheiro"
                  value={
                    <span className="text-success">
                      {formatCurrencyBRL(cashIn)}
                    </span>
                  }
                />
                <Field
                  label="Entradas PIX"
                  value={
                    <span className="text-success">
                      {formatCurrencyBRL(pixIn)}
                    </span>
                  }
                />
                <Field
                  label="Saídas em Dinheiro"
                  value={
                    <span className="text-destructive">
                      -{formatCurrencyBRL(cashOut)}
                    </span>
                  }
                />
              </div>

              <Separator />

              <Field
                label="Saldo Total Movimentado"
                value={
                  <span className="font-semibold">
                    {formatCurrencyBRL(totalIn)}
                  </span>
                }
              />

              <Separator />

              <Field
                label="Saldo Esperado em Dinheiro"
                value={
                  <span className="text-primary text-xl font-bold">
                    {formatCurrencyBRL(expectedCash)}
                  </span>
                }
              />
              <p className="bg-muted rounded-lg p-3 text-xs">
                Valor que deve existir em dinheiro no caixa após considerar
                todas as entradas e saídas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="countedAmount">Informe o dinheiro contado</Label>
              <Controller
                control={control}
                name="countedAmount"
                render={({ field }) => (
                  <CurrencyInput
                    id="countedAmount"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.countedAmount && (
                <p className="text-destructive text-sm">
                  {errors.countedAmount.message}
                </p>
              )}
            </div>

            {hasCountedInput && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Diferença</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    differenceTone === "green" && "text-success",
                    differenceTone === "yellow" &&
                      "text-amber-500 dark:text-amber-400",
                    differenceTone === "red" && "text-destructive",
                  )}
                >
                  {difference >= 0 ? "+" : "-"}
                  {formatCurrencyBRL(Math.abs(difference))}
                </p>
                {differenceTone !== "green" && (
                  <p
                    className={cn(
                      "rounded-lg p-3 text-xs",
                      differenceTone === "yellow" &&
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      differenceTone === "red" &&
                        "bg-destructive/10 text-destructive",
                    )}
                  >
                    Verifique o valor contado antes de confirmar o fechamento.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="closureNote">Observação (opcional)</Label>
              <Textarea
                id="closureNote"
                rows={2}
                {...register("closureNote")}
              />
              {errors.closureNote && (
                <p className="text-destructive text-sm">
                  {errors.closureNote.message}
                </p>
              )}
            </div>
          </div>

          {serverError && (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={closeCashRegister.isPending}>
              {closeCashRegister.isPending
                ? "Fechando..."
                : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
